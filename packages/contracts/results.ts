export type Results = {
    id: string;
    exam: Exam;
    grades: Grade[];
};

export type Grade = {
    studentId: string;
    grade: number; 
}

export type Exam = {
    name: string;
    date: string;
}