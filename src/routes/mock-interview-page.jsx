import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { LoaderPage } from "./loader-page.jsx";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/config/firebase.config";
import QuestionSection from "@/components/question-section.jsx";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export const MockInterviewPage = () => {
  const { interviewId } = useParams();
  const [interview, setInterview] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [answeredQuestions, setAnsweredQuestions] = useState([]);
  const [selectedSection, setSelectedSection] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    setIsLoading(true);
    const fetchInterview = async () => {
      try {
        const snap = await getDoc(doc(db, "interviews", interviewId));
        if (snap.exists()) {
          setInterview({ id: snap.id, ...snap.data() });
        } else {
          navigate("/generate", { replace: true });
        }
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    };
    fetchInterview();
  }, [interviewId, navigate]);

  const handleAnswerSaved = (questionText) => {
    setAnsweredQuestions((prev) => [...new Set([...prev, questionText])]);
  };

  const handleFeedbackRedirect = () => {
    navigate(`/generate/feedback/${interviewId}`);
  };

  if (isLoading) return <LoaderPage className="w-full h-[70vh]" />;
  if (!interview) return null;

  const allQuestions = interview.sections?.flatMap((section) => section.questions) || [];

  if (!selectedSection) {
    return (
        <div className="py-6 space-y-4">
          <h2 className="text-2xl font-semibold">Select a Section</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {interview.sections?.map((section, i) => (
                <Card
                    key={i}
                    className="p-4 cursor-pointer hover:shadow-md transition"
                    onClick={() => {
                      setSelectedSection(section);
                      setAnsweredQuestions([]); // reset answers when switching sections
                    }}
                >
                  <h3 className="text-lg font-bold">{section.type}</h3>
                  <p className="text-sm text-gray-500">{section.questions.length} questions</p>
                </Card>
            ))}
          </div>
        </div>
    );
  }

  const answeredInSection = answeredQuestions.filter(q =>
      selectedSection.questions.some(sq => sq.question.trim().toLowerCase() === q.trim().toLowerCase())
  );

  const allAnsweredInSection = answeredInSection.length === selectedSection.questions.length;

  return (
      <div className="flex flex-col w-full gap-8 py-5">
        <h2 className="text-xl font-bold text-gray-800">
          {selectedSection.type} Section
        </h2>

        {!allAnsweredInSection ? (
            <QuestionSection
                questions={selectedSection.questions}
                answeredQuestions={answeredQuestions}
                onAnswerSaved={handleAnswerSaved}
                interviewId={interviewId}
                allQuestions={allQuestions}
                sectionType={selectedSection.type}

            />
        ) : (
            <div className="mt-6 border rounded-md p-4 bg-emerald-50">
              <p className="text-sm text-emerald-700 font-medium">
                🎉 You've answered all questions in this section!
              </p>
              <div className="mt-3 flex justify-end gap-2">
                <Button variant="outline" onClick={() => setSelectedSection(null)}>Choose Another</Button>
                <Button onClick={handleFeedbackRedirect}>Check Feedback</Button>
              </div>
            </div>
        )}
      </div>
  );
};
