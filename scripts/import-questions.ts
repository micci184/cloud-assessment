import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, Prisma } from "@prisma/client";
import { parse } from "csv-parse/sync";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { Pool } from "pg";
import { z } from "zod";

const databaseUrl = process.env["DATABASE_URL"];

if (!databaseUrl) {
  throw new Error("DATABASE_URL is not set");
}

const pool = new Pool({
  connectionString: databaseUrl,
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const csvRowSchema = z.object({
  category: z.string().trim().min(1, "category is required"),
  level: z.coerce.number().int().min(1).max(3),
  questionText: z.string().trim().min(1, "questionText is required"),
  choice1: z.string().trim().min(1, "choice1 is required"),
  choice2: z.string().trim().min(1, "choice2 is required"),
  choice3: z.string().trim().min(1, "choice3 is required"),
  choice4: z.string().trim().min(1, "choice4 is required"),
  answerIndex: z.coerce.number().int().min(0).max(3),
  explanation: z.string().trim().min(1, "explanation is required"),
});

type QuestionImportRow = z.infer<typeof csvRowSchema>;

const parseCsv = async (csvPath: string): Promise<QuestionImportRow[]> => {
  const absolutePath = path.isAbsolute(csvPath)
    ? csvPath
    : path.resolve(process.cwd(), csvPath);
  const fileContent = await readFile(absolutePath, "utf-8");
  const parsedRows = parse(fileContent, {
    columns: true,
    bom: true,
    skip_empty_lines: true,
    trim: true,
  }) as Record<string, string>[];

  if (parsedRows.length === 0) {
    throw new Error("CSV has no data rows.");
  }

  const validationErrors: string[] = [];
  const validatedRows: QuestionImportRow[] = [];

  parsedRows.forEach((row, index) => {
    const parsed = csvRowSchema.safeParse(row);
    const csvRowNumber = index + 2;

    if (!parsed.success) {
      parsed.error.issues.forEach((issue) => {
        const field = issue.path.join(".") || "row";
        validationErrors.push(
          `row ${csvRowNumber}, field "${field}": ${issue.message}`,
        );
      });
      return;
    }

    validatedRows.push(parsed.data);
  });

  if (validationErrors.length > 0) {
    throw new Error(
      `CSV validation failed:\n- ${validationErrors.join("\n- ")}`,
    );
  }

  const duplicateKeySet = new Set<string>();
  validatedRows.forEach((row, index) => {
    const key = `${row.category}::${row.level}::${row.questionText}`;
    if (duplicateKeySet.has(key)) {
      throw new Error(
        `CSV has duplicate question key at row ${index + 2}: ${key}`,
      );
    }
    duplicateKeySet.add(key);
  });

  return validatedRows;
};

const main = async (): Promise<void> => {
  const csvPath = process.argv[2] ?? "data/questions.csv";
  const rows = await parseCsv(csvPath);

  let createdCount = 0;
  let updatedCount = 0;

  await prisma.$transaction(async (tx) => {
    for (const row of rows) {
      const choices: string[] = [row.choice1, row.choice2, row.choice3, row.choice4];
      const where = {
        category: row.category,
        level: row.level,
        questionText: row.questionText,
      };

      const existing = await tx.question.findFirst({
        where,
        select: { id: true },
      });

      if (existing) {
        await tx.question.update({
          where: { id: existing.id },
          data: {
            choices: choices as Prisma.JsonArray,
            answerIndex: row.answerIndex,
            explanation: row.explanation,
          },
        });
        updatedCount += 1;
      } else {
        await tx.question.create({
          data: {
            ...where,
            choices: choices as Prisma.JsonArray,
            answerIndex: row.answerIndex,
            explanation: row.explanation,
          },
        });
        createdCount += 1;
      }
    }
  });

  console.log(`Imported ${rows.length} questions from ${csvPath}`);
  console.log(`Created: ${createdCount}, Updated: ${updatedCount}`);
};

main()
  .then(async () => {
    await prisma.$disconnect();
    await pool.end();
  })
  .catch(async (error: unknown) => {
    console.error("Failed to import questions from CSV:", error);
    await prisma.$disconnect();
    await pool.end();
    process.exit(1);
  });
