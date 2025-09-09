import { Header } from "@/components/header";
import { ChatbotEditor } from "@/components/chatbot-editor";

export default function Admin() {
  const handleBack = () => {
    window.history.back();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <ChatbotEditor onBack={handleBack} />
      </main>
    </div>
  );
}
