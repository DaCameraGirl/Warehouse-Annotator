import React, { useState, useCallback, useMemo } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Info, Copy, Download, Wand2 } from 'lucide-react';
import { loadRulesConfig } from './services/rulesLoader.js';

const WarehouseCaptionChecker = () => {
  const [captionText, setCaptionText] = useState('A female worker wearing an orange safety vest and a blue t-shirt turns around from her workstation in the upper right corner of the building, faces the female worker wearing an orange vest, holding a cellphone in her hand. Yes Object Cellular Device Two female workers are at a workstation. One, in an orange safety vest over a blue shirt and black pants, is standing and monitoring the system. To the right of her, another worker, wearing a soft lavender t-shirt and black pants with a headband, stands in front of a roller conveyor, holding a cell phone and both workers are communicating with each other.');
  const [captionType, setCaptionType] = useState('dense');
  const [results, setResults] = useState(null);
  const [rewrittenText, setRewrittenText] = useState('');
  const [extractedCaptions, setExtractedCaptions] = useState([]);
  const [videoDuration, setVideoDuration] = useState('02:00');
  const [isProcessing, setIsProcessing] = useState(false);

  const rulesState = useMemo(() => {
    try {
      const { terminology, validationRules } = loadRulesConfig();
      return { terminology, validationRules, error: '' };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown rules configuration error';
      return {
        terminology: { approvedTerms: {}, incorrectTerms: {}, version: '', changelog: [] },
        validationRules: { bannedWords: [], version: '', changelog: [] },
        error: message
      };
    }
  }, []);

  const [rulesError, setRulesError] = useState(rulesState.error);
  const { approvedTerms, incorrectTerms } = rulesState.terminology;
  const { bannedWords } = rulesState.validationRules;

  // Check for present tense patterns
  const checkPresentTense = (text) => {
    const pastTenseIndicators = [
      /\b(walked|moved|picked|placed|carried|lifted|dropped|threw|kicked|entered|exited|stood|sat|ran|jumped)\b/gi,
      /\b\w+ed\b/g,
      /\bwas\b/gi,
      /\bwere\b/gi,
      /\bhad\b/gi
    ];

    const issues = [];
    pastTenseIndicators.forEach((pattern, index) => {
      const matches = text.match(pattern);
      if (matches) {
        if (index === 0) {
          issues.push(`Past tense verbs found: ${matches.join(', ')}`);
        } else if (index === 1) {
          const edWords = matches.filter(word => !['used', 'marked', 'stacked', 'filled', 'mounted'].includes(word.toLowerCase()));
          if (edWords.length > 0) {
            issues.push(`Possible past tense (-ed) verbs: ${edWords.join(', ')}`);
          }
        } else {
          issues.push(`Past tense helpers found: ${matches.join(', ')}`);
        }
      }
    });
    return issues;
  };

  const checkTerminology = (text) => {
    const issues = [];
    const suggestions = [];

    if (bannedWords && bannedWords.length > 0) {
      bannedWords.forEach(word => {
        const regex = new RegExp(`\\b${word}\\b`, 'gi');
        if (regex.test(text)) {
          const replacement = incorrectTerms ? incorrectTerms[word] : null;
          issues.push(`Banned word "${word}" found${replacement ? ` — use "${replacement}" instead` : ''}`);
        }
      });
    }

    if (incorrectTerms) {
      Object.entries(incorrectTerms).forEach(([wrong, correct]) => {
        if (bannedWords && bannedWords.includes(wrong)) return;
        const regex = new RegExp(`\\b${wrong}\\b`, 'gi');
        if (regex.test(text)) {
          suggestions.push(`Replace "${wrong}" with "${correct}"`);
        }
      });
    }

    return { issues, suggestions };
  };

  const checkSpatialLanguage = (text) => {
    const vagueTerms = ['somewhere', 'nearby', 'close to', 'far from', 'over there', 'this area'];
    const issues = [];
    vagueTerms.forEach(term => {
      if (text.toLowerCase().includes(term)) {
        issues.push(`Vague spatial term "${term}" — use specific location like "upper left", "center frame", "bay 3"`);
      }
    });
    return issues;
  };

  const checkRepetition = (text) => {
    const words = text.toLowerCase().split(/\s+/);
    const wordCounts = {};
    words.forEach(word => {
      if (word.length > 4) wordCounts[word] = (wordCounts[word] || 0) + 1;
    });
    const repeated = Object.entries(wordCounts).filter(([, count]) => count > 3).map(([word]) => word);
    return repeated.length > 0 ? [`Repeated words (3+ times): ${repeated.join(', ')}`] : [];
  };

  const checkGlobalCaption = (text) => {
    const issues = [];
    const suggestions = [];

    if (text.length < 100) issues.push('Global caption seems too short — aim for 100–300 characters');
    if (text.length > 400) issues.push('Global caption may be too long — aim for 100–300 characters');

    return { issues, suggestions };
  };

  const checkDenseCaption = (text) => {
    const issues = [];
    const suggestions = [];

    const hasWorkerIdentification = text.toLowerCase().includes('worker') && (text.includes('vest') || text.includes('shirt') || text.includes('glasses') || text.includes('hat'));
    if (!hasWorkerIdentification) {
      issues.push('Should identify worker with distinguishing clothing/features');
    }

    return { issues, suggestions };
  };

  const extractDenseCaptions = (text) => {
    const lines = text.split('\n').filter(l => l.trim());
    return lines.map((line, i) => ({ id: i, text: line.trim(), timestamp: null }));
  };

  const generateTimestamps = (count, duration) => {
    const [mins, secs] = duration.split(':').map(Number);
    const totalSecs = mins * 60 + secs;
    const interval = Math.floor(totalSecs / Math.max(count, 1));
    return Array.from({ length: count }, (_, i) => {
      const t = i * interval;
      const m = Math.floor(t / 60).toString().padStart(2, '0');
      const s = (t % 60).toString().padStart(2, '0');
      return `${m}:${s}`;
    });
  };

  // Auto-analyze on component mount
  React.useEffect(() => {
    if (captionText.trim()) {
      setTimeout(analyzeCaption, 1000);
    }
  }, []);

  const analyzeCaption = useCallback(() => {
    if (!captionText.trim()) {
      setResults(null);
      return;
    }

    setIsProcessing(true);

    let analysis;
    try {
      analysis = {
        tenseIssues: checkPresentTense(captionText),
        terminology: checkTerminology(captionText),
        spatialIssues: checkSpatialLanguage(captionText),
        repetitionIssues: checkRepetition(captionText),
        structure: captionType === 'global' ? checkGlobalCaption(captionText) : checkDenseCaption(captionText)
      };
      setRulesError('');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown rules configuration error';
      setRulesError(message);
      setResults(null);
      setIsProcessing(false);
      return;
    }

    // Generate extracted captions if raw text is detected
    if (captionText.length > 200 && captionText.includes(':') && (captionText.includes('worker') || captionText.includes('FEMA'))) {
      const extracted = extractDenseCaptions(captionText);
      const autoTimestamps = generateTimestamps(extracted.length, videoDuration);

      const captionsWithTimestamps = extracted.map((caption, index) => ({
        ...caption,
        timestamp: caption.timestamp || autoTimestamps[index]
      }));

      setExtractedCaptions(captionsWithTimestamps);
    } else {
      setExtractedCaptions([]);
    }

    // Calculate overall score
    const totalIssues = analysis.tenseIssues.length +
                       analysis.terminology.issues.length +
                       analysis.spatialIssues.length +
                       analysis.repetitionIssues.length +
                       analysis.structure.issues.length;

    let score = 'Pass';
    let color = 'text-green-600';
    let icon = CheckCircle;

    if (totalIssues > 5) {
      score = 'Fail';
      color = 'text-red-600';
      icon = XCircle;
    } else if (totalIssues > 0) {
      score = 'Review';
      color = 'text-yellow-600';
      icon = AlertTriangle;
    }

    setResults({
      ...analysis,
      score,
      color,
      icon,
      totalIssues
    });

    setIsProcessing(false);
  }, [captionText, captionType, videoDuration]);

  const ResultSection = ({ title, items, type, icon: Icon }) => {
    if (!items || items.length === 0) return null;
    const color = type === 'error' ? 'text-red-600 bg-red-50 border-red-200' : 'text-yellow-700 bg-yellow-50 border-yellow-200';
    return (
      <div className={`mb-4 p-3 rounded-lg border ${color}`}>
        <div className="flex items-center gap-2 mb-2 font-semibold text-sm">
          <Icon size={16} />
          {title}
        </div>
        <ul className="text-sm space-y-1">
          {items.map((item, i) => <li key={i}>• {item}</li>)}
        </ul>
      </div>
    );
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Warehouse Annotator</h1>
        <p className="text-gray-500 text-sm mb-6">Validate and clean up warehouse caption annotations</p>

        <div className="flex gap-4 mb-4">
          <button
            onClick={() => setCaptionType('dense')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${captionType === 'dense' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
          >
            Dense Caption
          </button>
          <button
            onClick={() => setCaptionType('global')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${captionType === 'global' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
          >
            Global Caption
          </button>
        </div>

        <div>
          <textarea
            value={captionText}
            onChange={(e) => {
              setCaptionText(e.target.value);
              if (e.target.value.trim()) {
                setTimeout(analyzeCaption, 500);
              }
            }}
            placeholder={captionType === 'global' ?
              "Enter your Global Caption here..." :
              "Paste your raw notes here and I'll extract clean captions automatically! Or enter a single dense caption to check."}
            className="w-full h-48 p-4 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-sm font-mono"
          />
          <div className="flex items-center justify-between mt-2">
            <p className="text-xs text-gray-500">
              Pro tip: Just paste your messy notes and I'll clean them up automatically!
            </p>
            {isProcessing && (
              <div className="flex items-center text-blue-600">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                Processing...
              </div>
            )}
          </div>
        </div>
      </div>

      {rulesError && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4">
          <strong>Configuration Error:</strong> {rulesError}
        </div>
      )}

      {results && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className={`flex items-center gap-3 mb-6 ${results.color}`}>
            <results.icon size={24} />
            <h2 className="text-xl font-bold">Analysis Results: {results.score}</h2>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Issues Found</h3>

              <ResultSection
                title="Present Tense Issues"
                items={results.tenseIssues}
                type="error"
                icon={XCircle}
              />

              <ResultSection
                title="Terminology Issues"
                items={results.terminology.issues}
                type="error"
                icon={XCircle}
              />

              <ResultSection
                title="Spatial Language"
                items={results.spatialIssues}
                type="warning"
                icon={AlertTriangle}
              />

              <ResultSection
                title="Repetition"
                items={results.repetitionIssues}
                type="warning"
                icon={AlertTriangle}
              />

              <ResultSection
                title="Structure"
                items={results.structure.issues}
                type="warning"
                icon={AlertTriangle}
              />
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Suggestions</h3>
              <ResultSection
                title="Terminology Suggestions"
                items={results.terminology.suggestions}
                type="warning"
                icon={Info}
              />
              {results.totalIssues === 0 && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
                  No issues found — this caption looks good!
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {extractedCaptions.length > 0 && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Extracted Captions</h2>
          <div className="space-y-3">
            {extractedCaptions.map((caption) => (
              <div key={caption.id} className="flex gap-3 p-3 bg-gray-50 rounded-md text-sm">
                <span className="text-blue-600 font-mono font-bold shrink-0">{caption.timestamp}</span>
                <span className="text-gray-700">{caption.text}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default WarehouseCaptionChecker;
