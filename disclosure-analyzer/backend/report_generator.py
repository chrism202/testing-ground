"""
PDF Report Generator for disclosure analysis
"""
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter, A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, PageBreak
from reportlab.platypus import Image as RLImage
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_RIGHT
from datetime import datetime
from typing import Dict


class ReportGenerator:
    """Generates PDF reports from risk analysis"""

    def __init__(self):
        self.styles = getSampleStyleSheet()
        self._create_custom_styles()

    def _create_custom_styles(self):
        """Create custom paragraph styles"""
        self.styles.add(ParagraphStyle(
            name='CustomTitle',
            parent=self.styles['Heading1'],
            fontSize=24,
            textColor=colors.HexColor('#1a1a1a'),
            spaceAfter=30,
            alignment=TA_CENTER
        ))

        self.styles.add(ParagraphStyle(
            name='SectionHeader',
            parent=self.styles['Heading2'],
            fontSize=16,
            textColor=colors.HexColor('#2c3e50'),
            spaceAfter=12,
            spaceBefore=12
        ))

        self.styles.add(ParagraphStyle(
            name='RiskTitle',
            parent=self.styles['Heading3'],
            fontSize=12,
            textColor=colors.HexColor('#2c3e50'),
            spaceAfter=6
        ))

        self.styles.add(ParagraphStyle(
            name='BodyText',
            parent=self.styles['Normal'],
            fontSize=10,
            textColor=colors.HexColor('#333333'),
            spaceAfter=6
        ))

    def generate_report(self, risk_data: Dict, output_path: str):
        """
        Generate comprehensive PDF report

        Args:
            risk_data: Categorized risk data
            output_path: Path to save the PDF
        """
        doc = SimpleDocTemplate(
            output_path,
            pagesize=letter,
            rightMargin=0.75*inch,
            leftMargin=0.75*inch,
            topMargin=0.75*inch,
            bottomMargin=0.75*inch
        )

        story = []

        # Title Page
        story.extend(self._create_title_page(risk_data))

        # Executive Summary
        story.extend(self._create_executive_summary(risk_data))

        # Statistics Overview
        story.extend(self._create_statistics_section(risk_data))

        story.append(PageBreak())

        # Red (Critical) Issues
        if risk_data['red_risks']:
            story.extend(self._create_risk_section(
                "🔴 CRITICAL ISSUES",
                risk_data['red_risks'],
                colors.HexColor('#dc3545')
            ))
            story.append(PageBreak())

        # Orange (Significant) Issues
        if risk_data['orange_risks']:
            story.extend(self._create_risk_section(
                "🟠 SIGNIFICANT ISSUES",
                risk_data['orange_risks'],
                colors.HexColor('#fd7e14')
            ))
            story.append(PageBreak())

        # Yellow (Minor) Issues
        if risk_data['yellow_risks']:
            story.extend(self._create_risk_section(
                "🟡 MINOR ISSUES",
                risk_data['yellow_risks'],
                colors.HexColor('#ffc107')
            ))

        # Build PDF
        doc.build(story)

    def _create_title_page(self, risk_data: Dict) -> list:
        """Create title page elements"""
        elements = []

        elements.append(Spacer(1, 1.5*inch))

        title = Paragraph(
            "Real Estate Disclosure Analysis Report",
            self.styles['CustomTitle']
        )
        elements.append(title)
        elements.append(Spacer(1, 0.5*inch))

        date_text = Paragraph(
            f"Generated: {datetime.now().strftime('%B %d, %Y at %I:%M %p')}",
            self.styles['BodyText']
        )
        elements.append(date_text)
        elements.append(Spacer(1, 0.3*inch))

        stats = risk_data['statistics']
        summary_data = [
            ['Total Documents Analyzed:', str(stats['documents_analyzed'])],
            ['Total Issues Found:', str(stats['total_issues'])],
            ['Critical Issues (Red):', str(stats['red_issues'])],
            ['Significant Issues (Orange):', str(stats['orange_issues'])],
            ['Minor Issues (Yellow):', str(stats['yellow_issues'])],
        ]

        summary_table = Table(summary_data, colWidths=[3*inch, 2*inch])
        summary_table.setStyle(TableStyle([
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 11),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ]))
        elements.append(summary_table)

        elements.append(PageBreak())

        return elements

    def _create_executive_summary(self, risk_data: Dict) -> list:
        """Create executive summary section"""
        elements = []

        header = Paragraph("Executive Summary", self.styles['SectionHeader'])
        elements.append(header)
        elements.append(Spacer(1, 0.2*inch))

        summary_text = risk_data['summary'].replace('🔴', '').replace('🟠', '').replace('🟡', '')
        summary = Paragraph(summary_text, self.styles['BodyText'])
        elements.append(summary)
        elements.append(Spacer(1, 0.3*inch))

        return elements

    def _create_statistics_section(self, risk_data: Dict) -> list:
        """Create statistics overview section"""
        elements = []

        header = Paragraph("Cost Analysis", self.styles['SectionHeader'])
        elements.append(header)
        elements.append(Spacer(1, 0.2*inch))

        stats = risk_data['statistics']
        cost_min = stats['total_cost_min']
        cost_max = stats['total_cost_max']

        cost_text = Paragraph(
            f"<b>Estimated Total Remediation Costs:</b> ${cost_min:,} - ${cost_max:,}",
            self.styles['BodyText']
        )
        elements.append(cost_text)
        elements.append(Spacer(1, 0.2*inch))

        # Risk distribution table
        risk_data_table = [
            ['Risk Level', 'Count', 'Description'],
            ['Critical (Red)', str(stats['red_issues']), 'Hundreds of thousands to remediate'],
            ['Significant (Orange)', str(stats['orange_issues']), 'Tens of thousands to remediate'],
            ['Minor (Yellow)', str(stats['yellow_issues']), 'Thousands to remediate'],
        ]

        risk_table = Table(risk_data_table, colWidths=[1.5*inch, 1*inch, 3.5*inch])
        risk_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#2c3e50')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 11),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('GRID', (0, 0), (-1, -1), 1, colors.grey),
            ('FONTSIZE', (0, 1), (-1, -1), 10),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f8f9fa')]),
        ]))
        elements.append(risk_table)
        elements.append(Spacer(1, 0.3*inch))

        return elements

    def _create_risk_section(self, title: str, issues: list, color: colors.Color) -> list:
        """Create a section for a specific risk level"""
        elements = []

        header = Paragraph(title, self.styles['SectionHeader'])
        elements.append(header)
        elements.append(Spacer(1, 0.2*inch))

        for i, issue in enumerate(issues, 1):
            # Issue header
            issue_title = Paragraph(
                f"<b>{i}. {issue.get('title', 'Untitled Issue')}</b>",
                self.styles['RiskTitle']
            )
            elements.append(issue_title)

            # Issue details table
            issue_data = [
                ['Source Document:', issue.get('document', 'Unknown')],
                ['Cost Estimate:', f"${issue.get('cost_min', 0):,} - ${issue.get('cost_max', 0):,}"],
                ['Severity:', issue.get('severity', 'Unknown').capitalize()],
            ]

            issue_table = Table(issue_data, colWidths=[1.5*inch, 5*inch])
            issue_table.setStyle(TableStyle([
                ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, -1), 9),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
                ('TOPPADDING', (0, 0), (-1, -1), 4),
            ]))
            elements.append(issue_table)
            elements.append(Spacer(1, 0.1*inch))

            # Description
            desc = Paragraph(
                f"<b>Description:</b> {issue.get('description', 'No description available')}",
                self.styles['BodyText']
            )
            elements.append(desc)
            elements.append(Spacer(1, 0.1*inch))

            # Recommended action
            if 'action' in issue and issue['action']:
                action = Paragraph(
                    f"<b>Recommended Action:</b> {issue['action']}",
                    self.styles['BodyText']
                )
                elements.append(action)

            elements.append(Spacer(1, 0.2*inch))

            # Divider line
            elements.append(Table([['']], colWidths=[6.5*inch], rowHeights=[1]))
            elements.append(Spacer(1, 0.2*inch))

        return elements
