"""
OpenAI integration for analyzing disclosure documents
"""
from openai import AsyncOpenAI
from typing import List, Dict
import asyncio


class OpenAIAnalyzer:
    """Analyzes disclosure documents using OpenAI API"""

    def __init__(self, api_key: str):
        self.client = AsyncOpenAI(api_key=api_key)
        self.model = "gpt-4-turbo-preview"  # Using GPT-4 for better analysis

    async def analyze_documents(self, documents: List[Dict]) -> List[Dict]:
        """
        Analyze all documents in parallel

        Args:
            documents: List of document dictionaries with text and metadata

        Returns:
            List of analysis results
        """
        tasks = [self._analyze_single_document(doc) for doc in documents]
        results = await asyncio.gather(*tasks, return_exceptions=True)

        # Filter out exceptions and return successful analyses
        analyses = []
        for i, result in enumerate(results):
            if isinstance(result, Exception):
                print(f"Error analyzing {documents[i]['filename']}: {result}")
                # Add error placeholder
                analyses.append({
                    'filename': documents[i]['filename'],
                    'document_type': documents[i]['document_type'],
                    'error': str(result),
                    'issues': []
                })
            else:
                analyses.append(result)

        return analyses

    async def _analyze_single_document(self, document: Dict) -> Dict:
        """
        Analyze a single document with type-specific prompts

        Args:
            document: Document dictionary with text and metadata

        Returns:
            Analysis result
        """
        doc_type = document['document_type']
        prompt = self._get_prompt_for_document_type(doc_type)

        # Truncate text if too long (max ~100k chars)
        text = document['text'][:100000]

        try:
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": prompt},
                    {"role": "user", "content": f"Document: {document['filename']}\n\n{text}"}
                ],
                temperature=0.3,
                max_tokens=2000
            )

            analysis_text = response.choices[0].message.content

            return {
                'filename': document['filename'],
                'document_type': doc_type,
                'analysis': analysis_text,
                'issues': self._parse_issues(analysis_text)
            }

        except Exception as e:
            raise Exception(f"OpenAI API error: {str(e)}")

    def _get_prompt_for_document_type(self, doc_type: str) -> str:
        """
        Get specialized analysis prompt based on document type

        Args:
            doc_type: Type of document

        Returns:
            Tailored prompt for the document type
        """
        base_instruction = """You are a real estate expert analyzing disclosure documents for potential issues and risks.
For each issue you find, provide:
1. Issue title
2. Description of the problem
3. Potential cost to remediate (in dollars)
4. Severity level (critical/high/medium/low)
5. Recommended action

Format each issue as:
ISSUE: [Title]
DESCRIPTION: [Detailed description]
COST: [Estimated cost range]
SEVERITY: [critical/high/medium/low]
ACTION: [Recommended action]
---"""

        specific_prompts = {
            'home_inspection': base_instruction + """
Focus on:
- Structural issues (foundation, framing, roof structure)
- Major system failures (HVAC, electrical, plumbing)
- Safety hazards (mold, asbestos, radon)
- Water damage or moisture issues
- Code violations
Look for items marked as "recommend evaluation" or "safety concern".""",

            'roof_inspection': base_instruction + """
Focus on:
- Roof age and remaining lifespan
- Active leaks or water intrusion
- Missing or damaged shingles/tiles
- Gutter and drainage issues
- Structural damage to roof deck
- Ventilation problems
Prioritize issues requiring immediate replacement vs. repairs.""",

            'pest_inspection': base_instruction + """
Focus on:
- Active termite or pest infestation
- Wood damage from termites or dry rot
- Moisture damage attracting pests
- Required fumigation or treatment
- Structural damage from pest activity
Distinguish between Section 1 (active infestation) and Section 2 (conducive conditions).""",

            'property_disclosure': base_instruction + """
Focus on:
- Known defects disclosed by seller
- Previous repairs or issues
- Neighborhood problems
- Environmental hazards
- Property boundary disputes
- Unpermitted work or additions
Look for "Yes" answers that indicate problems.""",

            'seller_questionnaire': base_instruction + """
Focus on:
- Disclosed defects or malfunctions
- Past repairs or replacements
- Insurance claims
- Drainage or flooding issues
- Soil or foundation problems
- Any "Yes" answers requiring further investigation.""",

            'lead_paint': base_instruction + """
Focus on:
- Presence of lead-based paint
- Required disclosures and testing
- Remediation requirements
- Child safety concerns
Properties built before 1978 are high risk.""",

            'natural_hazard': base_instruction + """
Focus on:
- Flood zones and flood risk
- Earthquake fault zones
- Fire hazard severity zones
- Landslide or soil stability issues
- Required insurance and mitigation
Assess impact on insurance costs and property value.""",

            'wildfire': base_instruction + """
Focus on:
- Fire hazard severity zone classification
- Required defensible space
- Ember-resistant construction requirements
- Insurance availability and cost
- Evacuation concerns
High and very high fire zones are critical.""",

            'hoa_documents': base_instruction + """
Focus on:
- Special assessments (current or planned)
- HOA financial health and reserves
- Restrictions affecting property use
- Pending litigation
- Deferred maintenance
- Monthly fee increases
Special assessments can be very expensive.""",

            'water_report': base_instruction + """
Focus on:
- Low water pressure issues
- Plumbing defects or leaks
- Water heater age and condition
- Sewer line problems
- Water quality issues
- Required upgrades or replacements.""",

            'preliminary_report': base_instruction + """
Focus on:
- Title defects or clouds
- Easements affecting property use
- Liens or encumbrances
- Access issues
- Boundary disputes
- Rights of way.""",

            'advisory': base_instruction + """
Focus on:
- Market condition warnings
- Legal requirement disclosures
- Buyer responsibilities
- Standard advisory notices
Most advisories are informational, but note any actionable items.""",

            'other': base_instruction + """
Analyze this document for any issues, defects, or concerns that could:
- Affect property value
- Require costly repairs
- Pose safety hazards
- Impact insurability
- Create legal liability"""
        }

        return specific_prompts.get(doc_type, specific_prompts['other'])

    def _parse_issues(self, analysis_text: str) -> List[Dict]:
        """
        Parse structured issues from the analysis text

        Args:
            analysis_text: Raw analysis from OpenAI

        Returns:
            List of parsed issues
        """
        issues = []
        sections = analysis_text.split('---')

        for section in sections:
            if 'ISSUE:' not in section:
                continue

            issue = {}
            lines = section.strip().split('\n')

            for line in lines:
                line = line.strip()
                if line.startswith('ISSUE:'):
                    issue['title'] = line.replace('ISSUE:', '').strip()
                elif line.startswith('DESCRIPTION:'):
                    issue['description'] = line.replace('DESCRIPTION:', '').strip()
                elif line.startswith('COST:'):
                    issue['cost_estimate'] = line.replace('COST:', '').strip()
                elif line.startswith('SEVERITY:'):
                    issue['severity'] = line.replace('SEVERITY:', '').strip().lower()
                elif line.startswith('ACTION:'):
                    issue['action'] = line.replace('ACTION:', '').strip()

            if 'title' in issue and 'description' in issue:
                issues.append(issue)

        return issues
