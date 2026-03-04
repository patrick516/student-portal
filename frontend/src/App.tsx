import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import AuthPage from "@/app/auth/AuthPage";
import StudentsPage from "@/app/students/StudentsPage";
import DashboardPage from "@/app/dashboard/DashboardPage";
import AppLayout from "@/app/layout/AppLayout";
import AttendancePage from "@/app/attendance/AttendancePage";
import FeesPage from "@/app/fees/FeesPage";
import SubjectsPage from "@/app/subjects/SubjectsPage";
import TeachersPage from "@/app/teachers/TeachersPage";
import ChangePasswordPage from "@/app/auth/ChangePasswordPage";
import UsersPage from "@/app/users/UsersPage";
import DebtorsPage from "@/app/reports/DebtorsPage";
import ClassesPage from "@/app/classes/ClassesPage";
import MySubjectsPage from "@/app/exams/MySubjectsPage";
import EnterMarksPage from "@/app/exams/EnterMarksPage";
import GradeSchemePage from "@/app/exams/GradeSchemePage";
import ResultsPage from "@/app/exams/ResultsPage";
import FormTeacherOverviewPage from "@/app/exams/FormTeacherOverviewPage";
import ReportCardPage from "@/app/exams/ReportCardPage";
import GuardiansPage from "@/app/guardians/GuardiansPage";
import StudentProfilePage from "@/app/students/StudentProfilePage";
import HeadteacherRegisterPage from "@/app/auth/HeadteacherRegisterPage";
import TermsPage from "@/app/terms/TermsPage";
import FeeSettingsPage from "@/app/fees/FeeSettingsPage";

function RequireAuth({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem("token");
  return token ? <>{children}</> : <Navigate to="/auth" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/auth/register-headteacher"
          element={<HeadteacherRegisterPage />}
        />
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/auth/change-password" element={<ChangePasswordPage />} />

        {/* Protected / App routes */}
        <Route
          path="/app"
          element={
            <RequireAuth>
              <AppLayout />
            </RequireAuth>
          }
        >
          <Route index element={<DashboardPage />} />
          <Route path="users" element={<UsersPage />} />
          <Route path="fees" element={<FeesPage />} />
          <Route path="students" element={<StudentsPage />} />
          <Route path="attendance" element={<AttendancePage />} />
          <Route path="teachers" element={<TeachersPage />} />
          <Route path="subjects" element={<SubjectsPage />} />
          <Route path="reports/debtors" element={<DebtorsPage />} />
          <Route path="classes" element={<ClassesPage />} /> {/* admin */}
          <Route path="exams/my" element={<MySubjectsPage />} />
          <Route path="exams/marks" element={<EnterMarksPage />} />
          <Route path="exams/grades" element={<GradeSchemePage />} />
          <Route path="exams/results" element={<ResultsPage />} />
          <Route path="exams/report-card" element={<ReportCardPage />} />
          <Route path="guardians" element={<GuardiansPage />} />
          <Route path="student-profile" element={<StudentProfilePage />} />
          <Route path="terms" element={<TermsPage />} />
          <Route path="fee-settings" element={<FeeSettingsPage />} />
          <Route
            path="exams/form-teacher"
            element={<FormTeacherOverviewPage />}
          />
        </Route>

        {/* Catch all */}
        <Route path="*" element={<Navigate to="/auth" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
