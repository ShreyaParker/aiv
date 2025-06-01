import { collection, query, where, getDocs, addDoc, deleteDoc, doc, serverTimestamp } from "firebase/firestore";
import { db } from "@/config/firebase.config";

export const fetchExistingAnswer = async (userId, questionText, interviewId) => {
    const q = query(
        collection(db, "userAnswers"),
        where("userId", "==", userId),
        where("question", "==", questionText),
        where("mockIdRef", "==", interviewId)
    );

    return await getDocs(q);  // directly return the Promise result
};


export const saveAnswerToDB = async (data) => {
    return await addDoc(collection(db, "userAnswers"), {
        ...data,
        createdAt: serverTimestamp(),
    });
};

export const deleteAnswerFromDB = async (docId) => {
    await deleteDoc(doc(db, "userAnswers", docId));
};
