import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { Document, Packer, Paragraph, Table, TableCell, TableRow, TextRun, BorderStyle, VerticalAlign, HeadingLevel, UnderlineType } from "docx";
import { saveAs } from "file-saver";
import type { OmrSheet, OmrSheetWithUser } from "@shared/schema";

export async function exportIndividualReportPDF(sheet: OmrSheet, userName: string) {
  const doc = new jsPDF();
  const pageHeight = doc.internal.pageSize.getHeight();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  let yPosition = margin;

  doc.setFontSize(20);
  doc.text("OMR Sheet Report", margin, yPosition);
  
  yPosition += 15;
  doc.setFontSize(11);
  doc.setTextColor(100);
  doc.text(`User: ${userName}`, margin, yPosition);
  yPosition += 6;
  doc.text(`Date: ${new Date(sheet.createdAt!).toLocaleDateString()}`, margin, yPosition);
  yPosition += 6;
  doc.text(`Sheet Name: ${sheet.name}`, margin, yPosition);
  
  yPosition += 12;
  doc.setTextColor(0);

  const subjects = [
    { title: "Physics", data: sheet.physics, color: [215, 75, 50] },
    { title: "Chemistry", data: sheet.chemistry, color: [150, 60, 40] },
    { title: "Biology", data: sheet.biology, color: [30, 70, 48] },
  ];

  for (const subject of subjects) {
    if (yPosition > pageHeight - 40) {
      doc.addPage();
      yPosition = margin;
    }

    doc.setFontSize(14);
    doc.setTextColor(subject.color[0], subject.color[1], subject.color[2]);
    doc.text(`${subject.title}`, margin, yPosition);
    yPosition += 10;

    doc.setFontSize(10);
    doc.setTextColor(80);
    
    doc.text(`Questions Present: ${subject.data.present}`, margin + 5, yPosition);
    yPosition += 6;

    const chapters = Object.entries(subject.data.chapters || {});
    doc.text("Chapters:", margin + 5, yPosition);
    yPosition += 5;

    for (const [chapterName, chapterData] of chapters) {
      const status = chapterData.done ? (chapterData.practiced ? "Done & Practiced" : "Done") : "Not Done";
      const questionsPracticed = chapterData.questionsPracticed || 0;
      
      doc.setFontSize(9);
      doc.text(
        `• ${chapterName}: ${status} | Questions: ${questionsPracticed}`,
        margin + 10,
        yPosition
      );
      yPosition += 5;

      if (yPosition > pageHeight - 20) {
        doc.addPage();
        yPosition = margin;
      }
    }

    yPosition += 5;
  }

  if (yPosition > pageHeight - 30) {
    doc.addPage();
    yPosition = margin;
  }

  doc.setFontSize(12);
  doc.setTextColor(0);
  doc.text("Summary", margin, yPosition);
  yPosition += 8;

  doc.setFontSize(10);
  doc.setTextColor(80);
  
  const physicsChapters = Object.values(sheet.physics.chapters || {});
  const chemistryChapters = Object.values(sheet.chemistry.chapters || {});
  const biologyChapters = Object.values(sheet.biology.chapters || {});

  const physicsDone = physicsChapters.filter(ch => ch.done).length;
  const chemistryDone = chemistryChapters.filter(ch => ch.done).length;
  const biologyDone = biologyChapters.filter(ch => ch.done).length;
  const totalDone = physicsDone + chemistryDone + biologyDone;
  const totalChapters = physicsChapters.length + chemistryChapters.length + biologyChapters.length;

  doc.text(`Chapters Completed: ${totalDone}/${totalChapters}`, margin + 5, yPosition);
  yPosition += 6;
  doc.text(`Physics: ${physicsDone}/${physicsChapters.length}`, margin + 5, yPosition);
  yPosition += 6;
  doc.text(`Chemistry: ${chemistryDone}/${chemistryChapters.length}`, margin + 5, yPosition);
  yPosition += 6;
  doc.text(`Biology: ${biologyDone}/${biologyChapters.length}`, margin + 5, yPosition);

  doc.save(`${userName}-${sheet.name}-${new Date().toISOString().split('T')[0]}.pdf`);
}

export async function exportIndividualReportWord(sheet: OmrSheet, userName: string) {
  const physicsChapters = Object.values(sheet.physics.chapters || {});
  const chemistryChapters = Object.values(sheet.chemistry.chapters || {});
  const biologyChapters = Object.values(sheet.biology.chapters || {});

  const physicsDone = physicsChapters.filter(ch => ch.done).length;
  const chemistryDone = chemistryChapters.filter(ch => ch.done).length;
  const biologyDone = biologyChapters.filter(ch => ch.done).length;
  const totalDone = physicsDone + chemistryDone + biologyDone;
  const totalChapters = physicsChapters.length + chemistryChapters.length + biologyChapters.length;

  const createChapterRows = (chapters: Record<string, any>) => {
    return Object.entries(chapters).map(([name, data]) => {
      const status = data.done ? (data.practiced ? "Done & Practiced" : "Done") : "Not Done";
      const questionsPracticed = data.questionsPracticed || 0;
      return new TableRow({
        children: [
          new TableCell({ children: [new Paragraph(name)] }),
          new TableCell({ children: [new Paragraph(status)] }),
          new TableCell({ children: [new Paragraph(questionsPracticed.toString())] }),
        ],
      });
    });
  };

  const doc = new Document({
    sections: [{
      children: [
        new Paragraph({
          text: "OMR Sheet Report",
          bold: true,
          size: 40,
          spacing: { after: 200 },
        }),
        new Paragraph(`User: ${userName}`),
        new Paragraph(`Date: ${new Date(sheet.createdAt!).toLocaleDateString()}`),
        new Paragraph(`Sheet Name: ${sheet.name}`),
        new Paragraph({ spacing: { after: 300 } }),

        new Paragraph({
          text: "Physics",
          bold: true,
          size: 32,
          spacing: { after: 100 },
        }),
        new Paragraph(`Questions Present: ${sheet.physics.present}`),
        new Table({
          width: { size: 100, type: "pct" },
          rows: [
            new TableRow({
              children: [
                new TableCell({ children: [new Paragraph({ text: "Chapter", bold: true })] }),
                new TableCell({ children: [new Paragraph({ text: "Status", bold: true })] }),
                new TableCell({ children: [new Paragraph({ text: "Questions Practiced", bold: true })] }),
              ],
            }),
            ...createChapterRows(sheet.physics.chapters || {}),
          ],
        }),
        new Paragraph({ spacing: { after: 200 } }),

        new Paragraph({
          text: "Chemistry",
          bold: true,
          size: 32,
          spacing: { after: 100 },
        }),
        new Paragraph(`Questions Present: ${sheet.chemistry.present}`),
        new Table({
          width: { size: 100, type: "pct" },
          rows: [
            new TableRow({
              children: [
                new TableCell({ children: [new Paragraph({ text: "Chapter", bold: true })] }),
                new TableCell({ children: [new Paragraph({ text: "Status", bold: true })] }),
                new TableCell({ children: [new Paragraph({ text: "Questions Practiced", bold: true })] }),
              ],
            }),
            ...createChapterRows(sheet.chemistry.chapters || {}),
          ],
        }),
        new Paragraph({ spacing: { after: 200 } }),

        new Paragraph({
          text: "Biology",
          bold: true,
          size: 32,
          spacing: { after: 100 },
        }),
        new Paragraph(`Questions Present: ${sheet.biology.present}`),
        new Table({
          width: { size: 100, type: "pct" },
          rows: [
            new TableRow({
              children: [
                new TableCell({ children: [new Paragraph({ text: "Chapter", bold: true })] }),
                new TableCell({ children: [new Paragraph({ text: "Status", bold: true })] }),
                new TableCell({ children: [new Paragraph({ text: "Questions Practiced", bold: true })] }),
              ],
            }),
            ...createChapterRows(sheet.biology.chapters || {}),
          ],
        }),
        new Paragraph({ spacing: { after: 300 } }),

        new Paragraph({
          text: "Summary",
          bold: true,
          size: 32,
          spacing: { after: 100 },
        }),
        new Paragraph(`Chapters Completed: ${totalDone}/${totalChapters}`),
        new Paragraph(`Physics: ${physicsDone}/${physicsChapters.length}`),
        new Paragraph(`Chemistry: ${chemistryDone}/${chemistryChapters.length}`),
        new Paragraph(`Biology: ${biologyDone}/${biologyChapters.length}`),
      ],
    }],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `${userName}-${sheet.name}-${new Date().toISOString().split('T')[0]}.docx`);
}

export async function exportComparativeReportPDF(sheets: OmrSheetWithUser[]) {
  const doc = new jsPDF();
  const pageHeight = doc.internal.pageSize.getHeight();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  let yPosition = margin;

  doc.setFontSize(20);
  doc.text("Comparative OMR Report", margin, yPosition);
  
  yPosition += 12;
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, margin, yPosition);
  doc.text(`Total Users: ${sheets.length}`, margin + 80, yPosition);
  
  yPosition += 15;
  doc.setTextColor(0);

  const tableData: string[][] = [];
  
  tableData.push(["User", "Physics", "Chemistry", "Biology", "Total Done", "Completion %"]);

  for (const sheet of sheets) {
    const physicsDone = Object.values(sheet.physics.chapters || {}).filter(ch => ch.done).length;
    const chemistryDone = Object.values(sheet.chemistry.chapters || {}).filter(ch => ch.done).length;
    const biologyDone = Object.values(sheet.biology.chapters || {}).filter(ch => ch.done).length;
    const totalDone = physicsDone + chemistryDone + biologyDone;
    
    const physicsCount = Object.keys(sheet.physics.chapters || {}).length;
    const chemistryCount = Object.keys(sheet.chemistry.chapters || {}).length;
    const biologyCount = Object.keys(sheet.biology.chapters || {}).length;
    const totalChapters = physicsCount + chemistryCount + biologyCount;
    
    const completion = totalChapters > 0 ? Math.round((totalDone / totalChapters) * 100) : 0;

    const userName = sheet.user?.firstName && sheet.user?.lastName
      ? `${sheet.user.firstName} ${sheet.user.lastName}`
      : sheet.user?.firstName || sheet.user?.email || "Unknown";

    tableData.push([
      userName,
      `${physicsDone}/${physicsCount}`,
      `${chemistryDone}/${chemistryCount}`,
      `${biologyDone}/${biologyCount}`,
      totalDone.toString(),
      `${completion}%`,
    ]);
  }

  (doc as any).autoTable({
    head: [tableData[0]],
    body: tableData.slice(1),
    startY: yPosition,
    margin: margin,
    headerStyles: {
      fillColor: [30, 70, 48],
      textColor: 255,
      fontStyle: "bold",
    },
    alternateRowStyles: {
      fillColor: [240, 240, 240],
    },
    columnStyles: {
      0: { cellWidth: 40 },
      1: { cellWidth: 20 },
      2: { cellWidth: 20 },
      3: { cellWidth: 20 },
      4: { cellWidth: 20 },
      5: { cellWidth: 20 },
    },
  });

  doc.save(`comparative-report-${new Date().toISOString().split('T')[0]}.pdf`);
}

export async function exportComparativeReportWord(sheets: OmrSheetWithUser[]) {
  const rows = [
    new TableRow({
      children: [
        new TableCell({ children: [new Paragraph({ text: "User", bold: true })] }),
        new TableCell({ children: [new Paragraph({ text: "Physics", bold: true })] }),
        new TableCell({ children: [new Paragraph({ text: "Chemistry", bold: true })] }),
        new TableCell({ children: [new Paragraph({ text: "Biology", bold: true })] }),
        new TableCell({ children: [new Paragraph({ text: "Total Done", bold: true })] }),
        new TableCell({ children: [new Paragraph({ text: "Completion %", bold: true })] }),
      ],
    }),
  ];

  for (const sheet of sheets) {
    const physicsDone = Object.values(sheet.physics.chapters || {}).filter(ch => ch.done).length;
    const chemistryDone = Object.values(sheet.chemistry.chapters || {}).filter(ch => ch.done).length;
    const biologyDone = Object.values(sheet.biology.chapters || {}).filter(ch => ch.done).length;
    const totalDone = physicsDone + chemistryDone + biologyDone;
    
    const physicsCount = Object.keys(sheet.physics.chapters || {}).length;
    const chemistryCount = Object.keys(sheet.chemistry.chapters || {}).length;
    const biologyCount = Object.keys(sheet.biology.chapters || {}).length;
    const totalChapters = physicsCount + chemistryCount + biologyCount;
    
    const completion = totalChapters > 0 ? Math.round((totalDone / totalChapters) * 100) : 0;

    const userName = sheet.user?.firstName && sheet.user?.lastName
      ? `${sheet.user.firstName} ${sheet.user.lastName}`
      : sheet.user?.firstName || sheet.user?.email || "Unknown";

    rows.push(
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph(userName)] }),
          new TableCell({ children: [new Paragraph(`${physicsDone}/${physicsCount}`)] }),
          new TableCell({ children: [new Paragraph(`${chemistryDone}/${chemistryCount}`)] }),
          new TableCell({ children: [new Paragraph(`${biologyDone}/${biologyCount}`)] }),
          new TableCell({ children: [new Paragraph(totalDone.toString())] }),
          new TableCell({ children: [new Paragraph(`${completion}%`)] }),
        ],
      })
    );
  }

  const doc = new Document({
    sections: [{
      children: [
        new Paragraph({
          text: "Comparative OMR Report",
          bold: true,
          size: 40,
          spacing: { after: 200 },
        }),
        new Paragraph(`Generated: ${new Date().toLocaleDateString()}`),
        new Paragraph(`Total Users: ${sheets.length}`),
        new Paragraph({ spacing: { after: 300 } }),
        new Table({
          width: { size: 100, type: "pct" },
          rows: rows,
        }),
      ],
    }],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `comparative-report-${new Date().toISOString().split('T')[0]}.docx`);
}
