export default function FAQSection() {
  return (
    <div className="mt-20 mb-12">
      <h2 className="text-3xl font-bold text-center mb-2">Frequently Asked Questions</h2>
      <p className="text-center text-[#707070] mb-10">Everything you need to know about LEYANI AI</p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl mx-auto">
        {[
          { q: "How long does it take to generate a study kit?", a: "Most documents are processed in 10-30 seconds. Larger files may take up to a minute." },
          { q: "What file formats are supported?", a: "We support PDF, PPTX, DOCX, and TXT files up to 50MB in size." },
          { q: "Are my files stored anywhere?", a: "No. Your files are processed instantly and deleted immediately. We never store your data." },
          { q: "Can I customize the quiz difficulty?", a: "Yes! Choose between Easy, Medium, or Hard difficulty levels before generating." },
          { q: "Can I retake quizzes?", a: "Absolutely! You can retake quizzes as many times as you want to improve your score." },
          { q: "What if the output isn't what I expected?", a: "You can regenerate with different settings (difficulty, question count, quiz type) to get better results." },
        ].map((faq, i) => (
          <div key={i} className="p-5 bg-[#232323] border border-[#2e2e2e] rounded-2xl shadow-xl hover:shadow-[0_8px_32px_rgba(62,207,142,0.08)] transition-all">
            <h3 className="font-bold text-[#3ecf8e] text-sm mb-2 flex items-start gap-2">
              <span className="text-lg flex-shrink-0">Q</span>
              {faq.q}
            </h3>
            <p className="text-xs text-[#a0a0a0] leading-relaxed">{faq.a}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
