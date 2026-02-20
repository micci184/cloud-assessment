import { PrismaPg } from "@prisma/adapter-pg";
import { Prisma, PrismaClient } from "@prisma/client";
import { Pool } from "pg";

const databaseUrl = process.env["DATABASE_URL"];

if (!databaseUrl) {
  throw new Error("DATABASE_URL is not set");
}

const pool = new Pool({
  connectionString: databaseUrl,
});

const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({ adapter });

type SeedQuestion = {
  category: string;
  level: number;
  questionText: string;
  choices: string[];
  answerIndex: number;
  explanation: string;
};

const seedQuestions: SeedQuestion[] = [
  {
    category: "VPC",
    level: 1,
    questionText: "VPCの主な役割として最も適切なものはどれですか？",
    choices: [
      "AWS上で分離された仮想ネットワークを提供する",
      "IAMユーザーを作成する",
      "オブジェクトストレージを提供する",
      "DNSレコードを管理する",
    ],
    answerIndex: 0,
    explanation:
      "VPCはAWS上でIPレンジやサブネットを設計できる仮想ネットワークです。",
  },
  {
    category: "VPC",
    level: 2,
    questionText:
      "インターネットから直接アクセスさせたくないEC2を配置する場所はどこですか？",
    choices: [
      "パブリックサブネット",
      "プライベートサブネット",
      "インターネットゲートウェイ",
      "NATゲートウェイ",
    ],
    answerIndex: 1,
    explanation: "外部公開しないEC2はプライベートサブネットに配置します。",
  },
  {
    category: "VPC",
    level: 3,
    questionText: "NATゲートウェイの主な用途は何ですか？",
    choices: [
      "インターネットからの受信トラフィックを受ける",
      "プライベートサブネットから外向き通信を可能にする",
      "DNS名を解決する",
      "VPC間を接続する",
    ],
    answerIndex: 1,
    explanation:
      "NATゲートウェイはプライベートサブネット内リソースのアウトバウンド通信を提供します。",
  },
  {
    category: "EC2",
    level: 1,
    questionText: "EC2とは何を提供するサービスですか？",
    choices: [
      "仮想サーバー",
      "オブジェクトストレージ",
      "リレーショナルDB",
      "CDN",
    ],
    answerIndex: 0,
    explanation: "EC2はElastic Compute Cloudであり、仮想サーバーを提供します。",
  },
  {
    category: "EC2",
    level: 2,
    questionText:
      "EC2のセキュリティグループの説明として正しいものはどれですか？",
    choices: [
      "サブネット単位で動作するステートレスフィルタ",
      "インスタンス単位で動作するステートフルファイアウォール",
      "IAMロールを発行する機能",
      "OSレベルのパッチ適用機能",
    ],
    answerIndex: 1,
    explanation:
      "セキュリティグループはインスタンスに関連付くステートフルな仮想ファイアウォールです。",
  },
  {
    category: "EC2",
    level: 3,
    questionText: "Auto Scalingの目的として最も適切なものはどれですか？",
    choices: [
      "ログの長期保存",
      "アクセス増減に応じたインスタンス数の自動調整",
      "暗号鍵の管理",
      "DNSルーティング",
    ],
    answerIndex: 1,
    explanation:
      "Auto Scalingは負荷に応じてインスタンス数を自動増減し可用性とコスト最適化を支援します。",
  },
  {
    category: "S3",
    level: 1,
    questionText: "S3で保存されるデータ単位は何ですか？",
    choices: ["ブロック", "オブジェクト", "レコード", "ページ"],
    answerIndex: 1,
    explanation:
      "S3はオブジェクトストレージであり、データはオブジェクトとして保存されます。",
  },
  {
    category: "S3",
    level: 2,
    questionText:
      "S3バケットをインターネット非公開に保つために有効な設定はどれですか？",
    choices: [
      "パブリックアクセスブロックを有効化",
      "バージョニングを有効化",
      "ライフサイクルを設定",
      "暗号化を無効化",
    ],
    answerIndex: 0,
    explanation: "パブリックアクセスブロックにより意図しない公開を防げます。",
  },
  {
    category: "S3",
    level: 3,
    questionText: "S3のライフサイクルポリシーで実現できることはどれですか？",
    choices: [
      "EC2インスタンスの自動再起動",
      "一定期間後にオブジェクトを低コストストレージへ移行",
      "IAMユーザーの削除",
      "VPCルートテーブルの更新",
    ],
    answerIndex: 1,
    explanation:
      "ライフサイクルは保存期間に応じてストレージクラス移行や削除を自動化できます。",
  },
  {
    category: "IAM",
    level: 1,
    questionText: "IAMの主な目的は何ですか？",
    choices: ["ネットワーク分離", "アクセス制御", "ログ収集", "コンテナ実行"],
    answerIndex: 1,
    explanation: "IAMはAWSリソースへの認証・認可を制御します。",
  },
  {
    category: "IAM",
    level: 2,
    questionText: "最小権限の原則として適切な考え方はどれですか？",
    choices: [
      "全ユーザーにAdministratorAccessを付与する",
      "必要な操作だけを許可するポリシーを付与する",
      "MFAを常に無効にする",
      "アクセスキーを全員で共有する",
    ],
    answerIndex: 1,
    explanation: "最小権限は業務に必要な最小限の権限だけを与える原則です。",
  },
  {
    category: "IAM",
    level: 3,
    questionText: "EC2からS3へ安全にアクセスさせる一般的な方法はどれですか？",
    choices: [
      "アクセスキーをAMIに埋め込む",
      "IAMロールをEC2インスタンスにアタッチする",
      "全S3バケットをパブリックにする",
      "セキュリティグループでS3権限を設定する",
    ],
    answerIndex: 1,
    explanation:
      "EC2にはIAMロールを付与し、一時的認証情報でアクセスさせるのが推奨です。",
  },
  {
    category: "CloudWatch",
    level: 1,
    questionText: "CloudWatch Metricsで主に扱うものはどれですか？",
    choices: ["監査証跡", "数値指標", "SQLクエリ", "DNSレコード"],
    answerIndex: 1,
    explanation:
      "CloudWatch MetricsはCPU使用率などの時系列数値データを扱います。",
  },
  {
    category: "CloudWatch",
    level: 2,
    questionText:
      "CPU使用率がしきい値を超えたら通知したい場合に使う機能はどれですか？",
    choices: [
      "CloudWatch Alarm",
      "CloudTrail Event",
      "Route 53 Health Check",
      "AWS Config Rule",
    ],
    answerIndex: 0,
    explanation:
      "CloudWatch Alarmでメトリクスしきい値を監視し、SNS通知などに連携できます。",
  },
  {
    category: "CloudWatch",
    level: 3,
    questionText:
      "アプリケーションログを一元的に収集・検索する際に使うCloudWatch機能はどれですか？",
    choices: [
      "CloudWatch Logs",
      "CloudWatch Synthetics",
      "CloudFormation",
      "AWS Backup",
    ],
    answerIndex: 0,
    explanation: "CloudWatch Logsはログの収集・検索・保持管理に利用します。",
  },
  {
    category: "CloudTrail",
    level: 1,
    questionText: "CloudTrailの主な用途はどれですか？",
    choices: [
      "請求管理",
      "API操作の監査ログ記録",
      "コンテナオーケストレーション",
      "キャッシュ管理",
    ],
    answerIndex: 1,
    explanation: "CloudTrailはAWS APIコール履歴を監査目的で記録します。",
  },
  {
    category: "CloudTrail",
    level: 2,
    questionText:
      "あるIAMユーザーが削除したS3バケット操作を追跡したい場合、まず確認すべきサービスはどれですか？",
    choices: [
      "CloudTrail",
      "CloudFront",
      "Trusted Advisor",
      "Elastic Beanstalk",
    ],
    answerIndex: 0,
    explanation: "誰がいつ何を実行したかの追跡はCloudTrailが基本です。",
  },
  {
    category: "CloudTrail",
    level: 3,
    questionText:
      "CloudTrailログの改ざん耐性を高める設定として有効なものはどれですか？",
    choices: [
      "ログ保存先をローカルPCにする",
      "ログファイル整合性検証を有効化する",
      "マルチAZを無効化する",
      "MFAを無効化する",
    ],
    answerIndex: 1,
    explanation:
      "ログファイル整合性検証により、ログ改ざんの検知が可能になります。",
  },
  {
    category: "RDS",
    level: 1,
    questionText: "RDSの説明として正しいものはどれですか？",
    choices: [
      "フルマネージドなリレーショナルデータベース",
      "オブジェクトストレージ",
      "DNSサービス",
      "メッセージキュー",
    ],
    answerIndex: 0,
    explanation: "RDSはMySQL/PostgreSQL等をマネージドで提供するサービスです。",
  },
  {
    category: "RDS",
    level: 2,
    questionText: "RDS Multi-AZの主な目的はどれですか？",
    choices: [
      "読み取り性能最大化",
      "高可用性の向上",
      "コスト最小化のみ",
      "アプリの自動デプロイ",
    ],
    answerIndex: 1,
    explanation:
      "Multi-AZはスタンバイレプリカを用いて障害時の可用性を高めます。",
  },
  {
    category: "RDS",
    level: 3,
    questionText:
      "本番DBの手動バックアップ運用を減らしたい。最も適切な機能はどれですか？",
    choices: [
      "自動バックアップとスナップショット",
      "EC2 Auto Scaling",
      "S3イベント通知",
      "IAM Access Analyzer",
    ],
    answerIndex: 0,
    explanation:
      "RDSの自動バックアップ設定でポイントインタイムリカバリが可能になります。",
  },
  {
    category: "Lambda",
    level: 1,
    questionText: "Lambdaの特徴として正しいものはどれですか？",
    choices: [
      "サーバー管理が必要",
      "イベント駆動でコードを実行できる",
      "常時起動VMのみ対応",
      "オンプレ専用",
    ],
    answerIndex: 1,
    explanation: "Lambdaはサーバーレスでイベントに応じて関数を実行します。",
  },
  {
    category: "Lambda",
    level: 2,
    questionText:
      "S3へのファイルアップロードをトリガーに処理したい場合、一般的な構成はどれですか？",
    choices: [
      "S3イベント通知でLambdaを起動",
      "Route 53でLambdaを起動",
      "CloudTrailでLambdaを停止",
      "RDSでLambdaを再起動",
    ],
    answerIndex: 0,
    explanation: "S3イベント通知はLambda連携の代表的なトリガーです。",
  },
  {
    category: "Lambda",
    level: 3,
    questionText:
      "Lambdaの同時実行数制御に関する説明で正しいものはどれですか？",
    choices: [
      "同時実行数は常に固定で変更不可",
      "予約済み同時実行で関数ごとに上限/確保を設定できる",
      "同時実行数はS3バケット数で決まる",
      "同時実行数はIAMユーザー数で決まる",
    ],
    answerIndex: 1,
    explanation:
      "予約済み同時実行により、特定関数のスロット確保や制限ができます。",
  },
];

const main = async (): Promise<void> => {
  await prisma.result.deleteMany();
  await prisma.attemptQuestion.deleteMany();
  await prisma.attempt.deleteMany();
  await prisma.question.deleteMany();

  await prisma.question.createMany({
    data: seedQuestions.map((question) => ({
      category: question.category,
      level: question.level,
      questionText: question.questionText,
      choices: question.choices as Prisma.JsonArray,
      answerIndex: question.answerIndex,
      explanation: question.explanation,
    })),
  });

  const categoryCount = seedQuestions.reduce<Record<string, number>>(
    (acc, question) => {
      acc[question.category] = (acc[question.category] ?? 0) + 1;
      return acc;
    },
    {},
  );

  console.log(`Seeded ${seedQuestions.length} questions.`);
  console.log("Category distribution:", categoryCount);
};

main()
  .then(async () => {
    await prisma.$disconnect();
    await pool.end();
  })
  .catch(async (error: unknown) => {
    console.error("Failed to seed database:", error);
    await prisma.$disconnect();
    await pool.end();
    process.exit(1);
  });
