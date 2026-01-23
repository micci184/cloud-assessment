/** 選択肢 */
export interface Choice {
  id: string;
  text: string;
}

/** 問題 */
export interface Question {
  id: string;
  text: string;
  choices: Choice[];
  correctChoiceId: string;
  explanation: string;
}

/** セット（問題集） */
export interface QuizSet {
  id: string;
  title: string;
  description: string;
  questions: Question[];
}
