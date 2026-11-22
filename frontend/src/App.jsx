import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';

import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import Documents from './pages/Documents';
import DocumentDetail from './pages/DocumentDetail';
import Flashcards from './pages/Flashcards';
import FlashcardStudy from './pages/FlashcardStudy';
import Quizzes from './pages/Quizzes';
import QuizTake from './pages/QuizTake';
import QuizResults from './pages/QuizResults';
import Profile from './pages/Profile';
import CareerGuidance from './pages/CareerGuidance';
import CareerAssessment from './pages/CareerAssessment';
import CareerResults from './pages/CareerResults';
import BookRecommendations from './pages/BookRecommendations';

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />

      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/documents" element={<ProtectedRoute><Documents /></ProtectedRoute>} />
      <Route path="/documents/:id" element={<ProtectedRoute><DocumentDetail /></ProtectedRoute>} />
      <Route path="/flashcards" element={<ProtectedRoute><Flashcards /></ProtectedRoute>} />
      <Route path="/flashcards/:setId" element={<ProtectedRoute><FlashcardStudy /></ProtectedRoute>} />
      <Route path="/quizzes" element={<ProtectedRoute><Quizzes /></ProtectedRoute>} />
      <Route path="/quizzes/results/:id" element={<ProtectedRoute><QuizResults /></ProtectedRoute>} />
      <Route path="/quizzes/:id" element={<ProtectedRoute><QuizTake /></ProtectedRoute>} />
      <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
      <Route path="/career" element={<ProtectedRoute><CareerGuidance /></ProtectedRoute>} />
      <Route path="/career/assessment" element={<ProtectedRoute><CareerAssessment /></ProtectedRoute>} />
      <Route path="/career/results/:id" element={<ProtectedRoute><CareerResults /></ProtectedRoute>} />
      <Route path="/books" element={<ProtectedRoute><BookRecommendations /></ProtectedRoute>} />

      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default App;
