import { FormMockInterview } from "@/components/form-mock-interview.jsx";
import { db } from "@/config/firebase.config";
import { doc, getDoc } from "firebase/firestore";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

export const CreateEditPage = () => {
  const { interviewId } = useParams();
  const [interview, setInterview] = useState(null);

  useEffect(() => {
    const fetchInterview = async () => {
      if (interviewId) {
        try {
          const interviewDoc = await getDoc(doc(db, "interviews", interviewId));
          if (interviewDoc.exists()) {
            setInterview({
              id: interviewDoc.id,
              ...interviewDoc.data(),
            });
          }
        } catch (error) {
          console.log(error);
        }
      }
    };

    fetchInterview();
  }, [interviewId]);

  return (
      <div className="my-4 flex-col w-full">
        <FormMockInterview initialData={interview} />
      </div>
  );
};
