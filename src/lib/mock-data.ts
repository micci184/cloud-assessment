import type { QuizSet } from "./types";

export const mockQuizSets: QuizSet[] = [
  {
    id: "aws-cloud-practitioner",
    title: "AWS Cloud Practitioner",
    description: "AWS クラウドの基礎知識を問う問題集",
    questions: [
      {
        id: "q1",
        text: "AWS のグローバルインフラストラクチャで、複数のアベイラビリティーゾーンで構成されるものは何ですか？",
        choices: [
          { id: "a", text: "エッジロケーション" },
          { id: "b", text: "リージョン" },
          { id: "c", text: "データセンター" },
          { id: "d", text: "VPC" },
        ],
        correctChoiceId: "b",
        explanation:
          "リージョンは地理的に離れた場所にあり、複数のアベイラビリティーゾーン（AZ）で構成されています。",
      },
      {
        id: "q2",
        text: "AWS の責任共有モデルにおいて、顧客が責任を負うものはどれですか？",
        choices: [
          { id: "a", text: "物理的なハードウェアのセキュリティ" },
          { id: "b", text: "ハイパーバイザーの管理" },
          { id: "c", text: "EC2 インスタンス上の OS パッチ適用" },
          { id: "d", text: "データセンターの電源管理" },
        ],
        correctChoiceId: "c",
        explanation:
          "責任共有モデルでは、顧客は「クラウド内の」セキュリティ（OS、アプリ、データ等）に責任を負います。",
      },
      {
        id: "q3",
        text: "オブジェクトストレージサービスはどれですか？",
        choices: [
          { id: "a", text: "Amazon EBS" },
          { id: "b", text: "Amazon S3" },
          { id: "c", text: "Amazon EFS" },
          { id: "d", text: "Amazon RDS" },
        ],
        correctChoiceId: "b",
        explanation:
          "Amazon S3 はオブジェクトストレージサービスです。EBS はブロックストレージ、EFS はファイルストレージです。",
      },
    ],
  },
  {
    id: "aws-solutions-architect",
    title: "AWS Solutions Architect Associate",
    description: "AWS ソリューションアーキテクト向け問題集",
    questions: [
      {
        id: "q1",
        text: "高可用性を実現するために、EC2 インスタンスを複数のアベイラビリティーゾーンに分散させる場合、どのサービスを使用しますか？",
        choices: [
          { id: "a", text: "Amazon CloudFront" },
          { id: "b", text: "Elastic Load Balancing" },
          { id: "c", text: "Amazon Route 53" },
          { id: "d", text: "AWS Direct Connect" },
        ],
        correctChoiceId: "b",
        explanation:
          "Elastic Load Balancing（ELB）は複数の AZ にまたがるインスタンスにトラフィックを分散させます。",
      },
      {
        id: "q2",
        text: "S3 のストレージクラスで、アクセス頻度が低いデータに最適なものはどれですか？",
        choices: [
          { id: "a", text: "S3 Standard" },
          { id: "b", text: "S3 Intelligent-Tiering" },
          { id: "c", text: "S3 Standard-IA" },
          { id: "d", text: "S3 One Zone-IA" },
        ],
        correctChoiceId: "c",
        explanation:
          "S3 Standard-IA（Infrequent Access）は、アクセス頻度が低いが、必要なときにすぐ取り出せるデータに最適です。",
      },
    ],
  },
  {
    id: "aws-developer",
    title: "AWS Developer Associate",
    description: "AWS 開発者向け問題集",
    questions: [
      {
        id: "q1",
        text: "AWS Lambda 関数のデフォルトのタイムアウト時間は何秒ですか？",
        choices: [
          { id: "a", text: "3 秒" },
          { id: "b", text: "15 秒" },
          { id: "c", text: "60 秒" },
          { id: "d", text: "300 秒" },
        ],
        correctChoiceId: "a",
        explanation:
          "Lambda のデフォルトタイムアウトは 3 秒です。最大 15 分（900 秒）まで設定できます。",
      },
    ],
  },
];
