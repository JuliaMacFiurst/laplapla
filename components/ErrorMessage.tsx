
import React from 'react';
import type { ErrorMessageProps } from '../types'; // Import the updated type

const ErrorMessage: React.FC<ErrorMessageProps> = ({ message, customTitle }) => {
  return (
    <div className="flex flex-col items-center justify-center h-full p-8 bg-red-100 rounded-2xl shadow-lg">
      <div className="text-5xl mb-4">😢</div>
      <h3 className="text-2xl font-bold text-red-700 mb-2">
        {customTitle || "Ой, что-то пошло не так!"}
      </h3>
      <p className="text-red-600 text-center">{message}</p>
      <p className="text-red-500 mt-2 text-sm">Попробуйте обновить страницу или загляните позже, капибары очень стараются всё исправить!</p>
    </div>
  );
};

export default ErrorMessage;
