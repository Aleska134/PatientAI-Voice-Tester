import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  HeadingLevel, AlignmentType, BorderStyle, WidthType, ShadingType,
  LevelFormat, PageNumber, Footer, PageBreak
} from 'docx';
import fs from 'fs';

// Accept call data as JSON from stdin
const input = JSON.parse(process.argv[2]);
const calls = input.calls;
const generatedAt = new Date().toLocaleString();

const border = { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" };
const borders = { top: border, bottom: border, left: border, right: border };

const divider = new Paragraph({
  border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: "2E75B6", space: 1 } },
  spacing: { before: 160, after: 160 },
  children: []
});

function makeLabel(text) {
  return new TextRun({ text, bold: true, font: "Arial", size: 20, color: "555555" });
}

function makeValue(text) {
  return new TextRun({ text: text || "N/A", font: "Arial", size: 20 });
}

function makeInfoRow(label, value) {
  return new TableRow({
    children: [
      new TableCell({
        borders,
        width: { size: 2200, type: WidthType.DXA },
        shading: { fill: "F0F4F8", type: ShadingType.CLEAR },
        margins: { top: 80, bottom: 80, left: 120, right: 120 },
        children: [new Paragraph({ children: [makeLabel(label)] })]
      }),
      new TableCell({
        borders,
        width: { size: 7160, type: WidthType.DXA },
        margins: { top: 80, bottom: 80, left: 120, right: 120 },
        children: [new Paragraph({ children: [makeValue(value)] })]
      })
    ]
  });
}

function buildCallSection(call, index) {
  const scenarioName = call.scenario_id.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  const transcriptLines = (call.transcript || '').split('\n').filter(l => l.trim());
  const bugLines = (call.bug_report || '').split('\n').filter(l => l.trim());

  const children = [
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 400, after: 120 },
      children: [new TextRun({ text: `Call ${index + 1}: ${scenarioName}`, font: "Arial", size: 32, bold: true, color: "1A1A2E" })]
    }),

    // Info table
    new Table({
      width: { size: 9360, type: WidthType.DXA },
      columnWidths: [2200, 7160],
      rows: [
        makeInfoRow("Call ID", call.id),
        makeInfoRow("Scenario", scenarioName),
        makeInfoRow("Status", call.status?.toUpperCase()),
        makeInfoRow("Date", new Date(call.created_at).toLocaleString()),
        makeInfoRow("Recording", call.recording_url || "Not available"),
      ]
    }),

    new Paragraph({ spacing: { before: 240, after: 80 }, children: [makeLabel("Transcript")] }),
  ];

  // Transcript lines
  transcriptLines.forEach(line => {
    const isPatient = line.startsWith('[Patient]');
    const isAgent = line.startsWith('[Agent]');
    children.push(
      new Paragraph({
        spacing: { before: 40, after: 40 },
        indent: { left: isAgent ? 0 : 360 },
        children: [
          new TextRun({
            text: line,
            font: "Courier New",
            size: 18,
            color: isPatient ? "1A5276" : isAgent ? "145A32" : "333333",
            bold: isPatient || isAgent
          })
        ]
      })
    );
  });

  // Bug report section
  children.push(
    new Paragraph({ spacing: { before: 240, after: 80 }, children: [makeLabel("Bug Report / Observations")] })
  );

  if (bugLines.length > 0) {
    bugLines.forEach(line => {
      children.push(
        new Paragraph({
          spacing: { before: 40, after: 40 },
          numbering: line.match(/^\d+\./) ? undefined : { reference: "bullets", level: 0 },
          children: [new TextRun({ text: line.replace(/^\d+\.\s*/, '').replace(/^[-•]\s*/, ''), font: "Arial", size: 20 })]
        })
      );
    });
  } else {
    children.push(
      new Paragraph({
        spacing: { before: 40, after: 40 },
        children: [new TextRun({ text: "No issues reported.", font: "Arial", size: 20, italics: true, color: "888888" })]
      })
    );
  }

  children.push(divider);
  return children;
}

// Build all sections
const allSections = [];
calls.forEach((call, i) => {
  buildCallSection(call, i).forEach(el => allSections.push(el));
});

const doc = new Document({
  numbering: {
    config: [
      {
        reference: "bullets",
        levels: [{
          level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } }
        }]
      }
    ]
  },
  styles: {
    default: { document: { run: { font: "Arial", size: 24 } } },
    paragraphStyles: [
      {
        id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 32, bold: true, font: "Arial", color: "1A1A2E" },
        paragraph: { spacing: { before: 240, after: 120 }, outlineLevel: 0 }
      }
    ]
  },
  sections: [{
    properties: {
      page: {
        size: { width: 12240, height: 15840 },
        margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 }
      }
    },
    footers: {
      default: new Footer({
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({ text: "Pretty Good AI — QA Report  |  Page ", font: "Arial", size: 16, color: "888888" }),
              new TextRun({ children: [PageNumber.CURRENT], font: "Arial", size: 16, color: "888888" }),
              new TextRun({ text: " of ", font: "Arial", size: 16, color: "888888" }),
              new TextRun({ children: [PageNumber.TOTAL_PAGES], font: "Arial", size: 16, color: "888888" }),
            ]
          })
        ]
      })
    },
    children: [
      // Cover header
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 480, after: 120 },
        children: [new TextRun({ text: "Pretty Good AI", font: "Arial", size: 48, bold: true, color: "1A1A2E" })]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: 80 },
        children: [new TextRun({ text: "Voice Agent QA Report", font: "Arial", size: 32, color: "2E75B6" })]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: 60 },
        children: [new TextRun({ text: `Generated: ${generatedAt}`, font: "Arial", size: 20, color: "888888", italics: true })]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: 480 },
        children: [new TextRun({ text: `Total Calls Analyzed: ${calls.length}`, font: "Arial", size: 22, bold: true, color: "555555" })]
      }),
      divider,
      ...allSections
    ]
  }]
});

Packer.toBuffer(doc).then(buffer => {
  fs.writeFileSync('/tmp/qa-report.docx', buffer);
  console.log('done');
});
