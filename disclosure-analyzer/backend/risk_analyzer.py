"""
Risk categorization and analysis engine
"""
import re
from typing import List, Dict
from datetime import datetime


class RiskAnalyzer:
    """Categorizes and analyzes risks from document analyses"""

    def __init__(self):
        # Cost thresholds for risk categories
        self.RED_THRESHOLD = 100000  # $100k+ = Red (hundreds of thousands)
        self.ORANGE_THRESHOLD = 10000  # $10k-$100k = Orange (tens of thousands)
        # Below $10k = Yellow (thousands)

    def categorize_risks(self, analyses: List[Dict]) -> Dict:
        """
        Categorize all issues from analyses into risk levels

        Args:
            analyses: List of document analyses

        Returns:
            Categorized risk summary
        """
        red_issues = []
        orange_issues = []
        yellow_issues = []
        all_issues = []

        for analysis in analyses:
            if 'error' in analysis:
                continue

            for issue in analysis.get('issues', []):
                # Enrich issue with document context
                enriched_issue = {
                    **issue,
                    'document': analysis['filename'],
                    'document_type': analysis['document_type']
                }

                # Extract cost and categorize
                cost_range = self._extract_cost(issue.get('cost_estimate', ''))
                enriched_issue['cost_min'] = cost_range[0]
                enriched_issue['cost_max'] = cost_range[1]
                enriched_issue['cost_category'] = self._get_cost_category(cost_range)

                # Categorize by cost
                max_cost = cost_range[1]
                if max_cost >= self.RED_THRESHOLD:
                    enriched_issue['risk_level'] = 'red'
                    red_issues.append(enriched_issue)
                elif max_cost >= self.ORANGE_THRESHOLD:
                    enriched_issue['risk_level'] = 'orange'
                    orange_issues.append(enriched_issue)
                else:
                    enriched_issue['risk_level'] = 'yellow'
                    yellow_issues.append(enriched_issue)

                all_issues.append(enriched_issue)

        # Calculate statistics
        total_cost_min = sum(issue['cost_min'] for issue in all_issues)
        total_cost_max = sum(issue['cost_max'] for issue in all_issues)

        # Generate executive summary
        summary = self._generate_summary(red_issues, orange_issues, yellow_issues)

        return {
            'summary': summary,
            'statistics': {
                'total_issues': len(all_issues),
                'red_issues': len(red_issues),
                'orange_issues': len(orange_issues),
                'yellow_issues': len(yellow_issues),
                'total_cost_min': total_cost_min,
                'total_cost_max': total_cost_max,
                'documents_analyzed': len(analyses)
            },
            'red_risks': sorted(red_issues, key=lambda x: x['cost_max'], reverse=True),
            'orange_risks': sorted(orange_issues, key=lambda x: x['cost_max'], reverse=True),
            'yellow_risks': sorted(yellow_issues, key=lambda x: x['cost_max'], reverse=True),
            'all_issues': all_issues,
            'timestamp': datetime.now().isoformat()
        }

    def _extract_cost(self, cost_str: str) -> tuple:
        """
        Extract cost range from cost estimate string

        Args:
            cost_str: Cost estimate string (e.g., "$5,000 - $15,000")

        Returns:
            Tuple of (min_cost, max_cost)
        """
        if not cost_str:
            return (0, 0)

        # Remove currency symbols and common words
        cleaned = cost_str.replace('$', '').replace(',', '').lower()

        # Find all numbers
        numbers = re.findall(r'\d+', cleaned)

        if not numbers:
            # Try to infer from keywords
            if 'hundred thousand' in cleaned or 'hundreds of thousands' in cleaned:
                return (100000, 500000)
            elif 'tens of thousands' in cleaned or 'ten thousand' in cleaned:
                return (10000, 99999)
            elif 'thousand' in cleaned:
                return (1000, 9999)
            else:
                return (0, 0)

        # Convert to integers
        values = [int(n) for n in numbers]

        # Handle K/M notation
        if 'k' in cleaned:
            values = [v * 1000 if v < 1000 else v for v in values]
        if 'm' in cleaned:
            values = [v * 1000000 if v < 1000 else v for v in values]

        if len(values) >= 2:
            return (min(values), max(values))
        elif len(values) == 1:
            # Single value - create a range
            val = values[0]
            return (val, int(val * 1.5))
        else:
            return (0, 0)

    def _get_cost_category(self, cost_range: tuple) -> str:
        """Get human-readable cost category"""
        min_cost, max_cost = cost_range

        if max_cost >= self.RED_THRESHOLD:
            return "Hundreds of thousands"
        elif max_cost >= self.ORANGE_THRESHOLD:
            return "Tens of thousands"
        else:
            return "Thousands"

    def _generate_summary(self, red_issues: List, orange_issues: List, yellow_issues: List) -> str:
        """
        Generate executive summary of findings

        Args:
            red_issues: Critical issues
            orange_issues: Significant issues
            yellow_issues: Minor issues

        Returns:
            Executive summary text
        """
        summary_parts = []

        summary_parts.append(f"Analysis identified {len(red_issues) + len(orange_issues) + len(yellow_issues)} total issues.")

        if red_issues:
            summary_parts.append(
                f"\n🔴 CRITICAL ({len(red_issues)} issues): "
                f"These issues may cost hundreds of thousands of dollars to remediate. "
                f"Immediate attention required."
            )
            # Highlight top 3 critical issues
            for i, issue in enumerate(red_issues[:3], 1):
                summary_parts.append(
                    f"  {i}. {issue['title']} (from {issue['document']})"
                )

        if orange_issues:
            summary_parts.append(
                f"\n🟠 SIGNIFICANT ({len(orange_issues)} issues): "
                f"These issues may cost tens of thousands of dollars to address. "
                f"Should be addressed before purchase or negotiated."
            )

        if yellow_issues:
            summary_parts.append(
                f"\n🟡 MINOR ({len(yellow_issues)} issues): "
                f"These are smaller issues costing thousands of dollars. "
                f"Plan for repairs but not deal-breakers."
            )

        if not red_issues and not orange_issues and not yellow_issues:
            summary_parts.append("No significant issues identified in the disclosure package.")

        return "\n".join(summary_parts)
