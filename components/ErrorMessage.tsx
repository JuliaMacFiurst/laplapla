import type { ErrorMessageProps } from '../types/types'; // Import the updated type
import type { dictionaries } from "@/i18n";

type CapybaraPageDict = (typeof dictionaries)["ru"]["capybaras"]["capybaraPage"];

const ErrorMessage: React.FC<ErrorMessageProps & { dict: CapybaraPageDict }> = ({ message, customTitle, dict }) => {
  return (
    <div className="flex flex-col items-center justify-center h-full p-8 bg-red-100 rounded-2xl shadow-lg">
      <div className="text-5xl mb-4">😢</div>
      <h3 className="text-2xl font-bold text-red-700 mb-2">
        {customTitle || dict.errors.errorTitle}
      </h3>
      <p className="text-red-600 text-center">{message}</p>
      <p className="text-red-500 mt-2 text-sm">{dict.errors.errorHint}</p>
    </div>
  );
};

export default ErrorMessage;
