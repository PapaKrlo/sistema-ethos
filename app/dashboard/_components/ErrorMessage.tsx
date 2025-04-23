interface ErrorMessageProps {
  message: string;
}

export default function ErrorMessage({ message }: ErrorMessageProps) {
  return (
    <div className="w-full p-4 text-center text-red-600">
      {message}
    </div>
  );
} 