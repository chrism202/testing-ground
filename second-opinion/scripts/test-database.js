const { database } = require('../lib/database');

async function testDatabase() {
  await database().query(`DO $$
    DECLARE
      evaluator text := '__test_' || gen_random_uuid()::text;
      ranking text := '__test_' || gen_random_uuid()::text;
      request uuid := gen_random_uuid();
      result record;
      before_disagree double precision;
      i integer;
    BEGIN
      -- Subtransaction rolls all fixtures back; genuine assertions still fail the build.
      BEGIN
        INSERT INTO la_evaluators(id, seed_elo, elo) VALUES (evaluator, 1200, 1200);
        INSERT INTO la_claims(id, evaluator_id, snapshot) VALUES (ranking, evaluator, '{}'::jsonb);
        SELECT * INTO result FROM la_cast_vote(request, 'test-voter-1', evaluator, ranking, true);
        IF result.elo <> 1216 OR result.votes <> 1 OR result.agreements <> 1 OR result.duplicate THEN
          RAISE EXCEPTION 'Agree did not update exactly one evaluator';
        END IF;
        SELECT * INTO result FROM la_cast_vote(request, 'test-voter-1', evaluator, ranking, true);
        IF result.votes <> 1 OR NOT result.duplicate THEN RAISE EXCEPTION 'Request replay counted twice'; END IF;
        SELECT * INTO result FROM la_cast_vote(gen_random_uuid(), 'test-voter-1', evaluator, ranking, false);
        IF result.votes <> 1 OR NOT result.duplicate THEN RAISE EXCEPTION 'Same browser voted twice'; END IF;
        before_disagree := result.elo;
        SELECT * INTO result FROM la_cast_vote(gen_random_uuid(), 'test-voter-2', evaluator, ranking, false);
        IF result.elo >= before_disagree OR result.votes <> 2 OR result.agreements <> 1 THEN RAISE EXCEPTION 'Disagree update incorrect'; END IF;
        BEGIN
          PERFORM * FROM la_cast_vote(gen_random_uuid(), 'test-voter-3', evaluator, 'missing-ranking', true);
          RAISE EXCEPTION 'Unknown claim was accepted';
        EXCEPTION WHEN SQLSTATE 'P4000' THEN NULL;
        END;
        FOR i IN 1..60 LOOP
          PERFORM * FROM la_cast_vote(gen_random_uuid(), 'quota-voter-' || i, evaluator || '-quota', ranking, true);
        END LOOP;
        BEGIN
          PERFORM * FROM la_cast_vote(gen_random_uuid(), 'quota-voter-61', evaluator || '-quota', ranking, true);
          RAISE EXCEPTION 'Rate limit did not reject vote 61';
        EXCEPTION WHEN SQLSTATE 'P4290' THEN NULL;
        END;
        RAISE EXCEPTION 'Roll back database self-test fixtures' USING ERRCODE = 'ZX000';
      EXCEPTION WHEN SQLSTATE 'ZX000' THEN NULL;
      END;
      IF EXISTS (SELECT 1 FROM la_evaluators e WHERE e.id = evaluator) THEN RAISE EXCEPTION 'Test fixtures were not rolled back'; END IF;
    END;
  $$;`);
  console.log('Database checks passed: agree/disagree, idempotent retries, one vote per browser per claim, unknown claims, rate limits, fixture rollback.');
}

if (require.main === module) testDatabase().catch(error => {
  console.error('Database checks failed:', error.code || error.name, error.message);
  process.exitCode = 1;
});
module.exports = { testDatabase };
