CREATE TABLE IF NOT EXISTS la_evaluators (
  id text PRIMARY KEY,
  seed_elo double precision NOT NULL,
  elo double precision NOT NULL,
  votes integer NOT NULL DEFAULT 0 CHECK (votes >= 0),
  agreements integer NOT NULL DEFAULT 0 CHECK (agreements BETWEEN 0 AND votes)
);

-- statement-break
CREATE TABLE IF NOT EXISTS la_claims (
  id text PRIMARY KEY,
  evaluator_id text NOT NULL REFERENCES la_evaluators(id),
  snapshot jsonb NOT NULL,
  active boolean NOT NULL DEFAULT true
);

-- statement-break
CREATE TABLE IF NOT EXISTS la_votes (
  id uuid PRIMARY KEY,
  voter_hash text NOT NULL,
  network_hash text NOT NULL,
  claim_id text NOT NULL REFERENCES la_claims(id),
  agree boolean NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (voter_hash, claim_id)
);
-- statement-break
CREATE INDEX IF NOT EXISTS la_votes_network_time ON la_votes(network_hash, created_at);

-- statement-break
CREATE OR REPLACE FUNCTION la_cast_vote(
  request_id uuid, actor text, network_id text, ranking_id text, agreement boolean
) RETURNS TABLE (provider_id text, elo double precision, votes integer, agreements integer, duplicate boolean)
LANGUAGE plpgsql AS $$
DECLARE
  evaluator text;
  previous la_votes%ROWTYPE;
BEGIN
  -- Serialize only this browser's retries; shared networks have no vote quota.
  PERFORM pg_advisory_xact_lock(hashtextextended(actor, 0));
  SELECT c.evaluator_id INTO evaluator FROM la_claims c WHERE c.id = ranking_id AND c.active;
  IF evaluator IS NULL THEN RAISE EXCEPTION 'Unknown ranking' USING ERRCODE = 'P4000'; END IF;

  SELECT v.* INTO previous FROM la_votes v
    WHERE v.id = request_id OR (v.voter_hash = actor AND v.claim_id = ranking_id) LIMIT 1;
  IF FOUND THEN
    IF previous.voter_hash <> actor OR previous.claim_id <> ranking_id THEN
      RAISE EXCEPTION 'Request ID reused' USING ERRCODE = 'P4000';
    END IF;
    RETURN QUERY SELECT e.id, e.elo, e.votes, e.agreements, true FROM la_evaluators e WHERE e.id = evaluator;
    RETURN;
  END IF;

  -- One evaluator changes per vote; model ratings and other evaluators do not.
  -- The fixed 1200 reference turns agree/disagree into an Elo-style rating.
  PERFORM 1 FROM la_evaluators e WHERE e.id = evaluator FOR UPDATE;
  INSERT INTO la_votes(id, voter_hash, network_hash, claim_id, agree)
    VALUES (request_id, actor, network_id, ranking_id, agreement);
  UPDATE la_evaluators e SET
    elo = e.elo + 32 * ((CASE WHEN agreement THEN 1 ELSE 0 END) - 1 / (1 + power(10.0, (1200 - e.elo) / 400))),
    votes = e.votes + 1,
    agreements = e.agreements + CASE WHEN agreement THEN 1 ELSE 0 END
    WHERE e.id = evaluator;
  RETURN QUERY SELECT e.id, e.elo, e.votes, e.agreements, false FROM la_evaluators e WHERE e.id = evaluator;
END;
$$;
