import { Check, Copy, Download, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import type { GlassStyle, AnimationStyle } from '../types';
import { useState } from 'react';

interface ResearchReportProps {
  output: {
    summary: string;
    details: {
      report: string;
    };
  } | null;
  isResetting: boolean;
  isStreaming: boolean;
  glassStyle: GlassStyle;
  fadeInAnimation: AnimationStyle;
  loaderColor: string;
  isGeneratingPdf: boolean;
  isCopied: boolean;
  onCopyToClipboard: () => void;
  onGeneratePdf: () => void;
}

interface ReportSectionProps {
  title: string;
  content: Array<{ heading: string; content: string }>;
}

const ReportSection = ({ title, content }: ReportSectionProps) => {
  const [isOpen, setIsOpen] = useState(true);

  if (!content || !Array.isArray(content) || content.length === 0) return null;

  return (
    <div className={`mb-6 overflow-hidden rounded-xl border border-gray-200 bg-white/50 shadow-sm transition-all duration-300`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between p-4 text-left hover:bg-gray-50/50"
      >
        <h2 className="text-xl font-bold text-gray-800">{title}</h2>
        {isOpen ? <ChevronUp className="h-5 w-5 text-gray-500" /> : <ChevronDown className="h-5 w-5 text-gray-500" />}
      </button>

      {isOpen && (
        <div className="border-t border-gray-100 p-4 space-y-4">
          {content.map((item, index) => (
            <div key={index} className="space-y-1">
              {item.heading && <h3 className="text-sm font-semibold text-[#468BFF] uppercase tracking-wider">{item.heading}</h3>}
              <div className="text-gray-700 leading-relaxed text-sm">
                {item.content.startsWith('*') ? (
                  <ul className="list-disc pl-5 space-y-1 mt-1">
                    {item.content.split('\n').map((line, i) => {
                      const cleanLine = line.replace(/^\* /, '').trim();
                      if (!cleanLine) return null;
                      return <li key={i}>{cleanLine}</li>
                    })}
                  </ul>
                ) : (
                  <p className="whitespace-pre-wrap">{item.content}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const ResearchReport = ({
  output,
  isResetting,
  isStreaming,
  glassStyle,
  fadeInAnimation,
  loaderColor,
  isGeneratingPdf,
  isCopied,
  onCopyToClipboard,
  onGeneratePdf
}: ResearchReportProps) => {
  if (!output || !output.details) return null;

  let reportData: any = {};
  let isRawText = false;

  try {
    // Try parsing as JSON first
    reportData = JSON.parse(output.details.report);
  } catch (e) {
    // Fallback to raw text if it's not valid JSON (e.g. streaming or error)
    isRawText = true;
    reportData = { raw: output.details.report };
  }

  return (
    <div
      className={`${glassStyle.card} ${fadeInAnimation.fadeIn} ${isResetting ? 'opacity-0 transform -translate-y-4' : 'opacity-100 transform translate-y-0'} font-['DM_Sans']`}
    >
      {isStreaming && (
        <div className="flex items-center gap-2 mb-4 px-4 py-2 bg-[#468BFF]/10 rounded-lg border border-[#468BFF]/20">
          <Loader2 className="h-4 w-4 animate-spin" style={{ stroke: loaderColor }} />
          <span className="text-sm text-gray-600">
            {isRawText ? "Generating report..." : "Finalizing report..."}
          </span>
        </div>
      )}
      <div className="flex justify-end gap-2 mb-4">
        {output?.details?.report && (
          <>
            <button
              onClick={onCopyToClipboard}
              className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-[#468BFF] text-white hover:bg-[#8FBCFA] transition-all duration-200"
            >
              {isCopied ? (
                <Check className="h-5 w-5" />
              ) : (
                <Copy className="h-5 w-5" />
              )}
            </button>
            <button
              onClick={onGeneratePdf}
              disabled={isGeneratingPdf}
              className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-[#FFB800] text-white hover:bg-[#FFA800] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGeneratingPdf ? (
                <>
                  <Loader2 className="animate-spin h-5 w-5 mr-2" style={{ stroke: loaderColor }} />
                  Generating PDF...
                </>
              ) : (
                <>
                  <Download className="h-5 w-5" />
                  <span className="ml-2">PDF</span>
                </>
              )}
            </button>
          </>
        )}
      </div>

      <div className="max-w-none">
        {isRawText ? (
          <div className="prose prose-sm max-w-none text-gray-600 whitespace-pre-wrap font-mono p-4 bg-gray-50 rounded-lg">
            {reportData.raw}
          </div>
        ) : (
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-8 border-b pb-4">Research Report</h1>

            <ReportSection title="Company Overview" content={reportData.company_overview} />
            <ReportSection title="Industry Overview" content={reportData.industry_overview} />
            <ReportSection title="Financial Overview" content={reportData.financial_overview} />
            <ReportSection title="News" content={reportData.news_overview} />

            {reportData.references && (
              <div className="mt-8 pt-8 border-t border-gray-200">
                <h3 className="text-lg font-bold text-gray-900 mb-4">References</h3>
                <ul className="list-decimal pl-5 space-y-2 text-sm text-gray-600">
                  {reportData.references.map((ref: any, i: number) => {
                    const url = typeof ref === 'string' ? ref : ref.url;
                    const title = typeof ref === 'string' ? ref : (ref.title || ref.url);
                    return (
                      <li key={i}>
                        <a
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#468BFF] hover:underline"
                        >
                          {title}
                        </a>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

          </div>
        )}
      </div>
    </div>
  );
};

export default ResearchReport; 