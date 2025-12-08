


const LoadingSpinner: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center h-full">
      <div className="w-20 h-20 border-8 border-dashed border-pink-400 border-t-transparent rounded-full animate-spin"></div>
      <p className="mt-6 text-2xl text-pink-500 font-semibold">Капибары готовят сказки...</p>
    </div>
  );
};

export default LoadingSpinner;
