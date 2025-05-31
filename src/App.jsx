import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

import { PublicLayout } from "@/layouts/public-layout.jsx";
import HomePage from "@/routes/home.jsx";
import AuthenticationLayout from "@/layouts/auth-layout.jsx";
import { SignInPage } from "@/routes/sign-in.jsx";
import { Generate } from "@/components/generate.jsx";
import { Dashboard } from "@/routes/dashboard.jsx";
import ProtectRoutes from "@/routes/protected-routes.jsx";
import {CreateEditPage} from "@/routes/create-edit-page.jsx";

import {MockInterviewPage} from "@/routes/mock-interview-page.jsx";
import {Feedback} from "@/routes/feedback.jsx";


const App = () => {
    return (
        <Router>
            <Routes>
                <Route element={<PublicLayout />}>
                    <Route index element={<HomePage />} />
                </Route>

                <Route element={<AuthenticationLayout />}>
                    <Route path="/signin/*" element={<SignInPage />} />
                </Route>

                <Route
                    element={
                       <ProtectRoutes>
                            <Generate />

                       </ProtectRoutes>

                    }
                    path="/generate"
                >
                    <Route index element={<Dashboard />} />
                    <Route path=":interviewId" element={<CreateEditPage />} />

                    <Route
                        path="interview/:interviewId/start"
                        element={<MockInterviewPage />}
                    />
                    <Route path="feedback/:interviewId" element={<Feedback />} />

                </Route>
            </Routes>
        </Router>
    );
};

export default App;
