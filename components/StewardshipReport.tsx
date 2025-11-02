
import React, { useState } from 'react';
import { GoogleGenAI } from "@google/genai";
import { FileText, Lightbulb } from 'lucide-react';

const CASE_REPORT_TEXT = `I. Historical and Cultural Significance 🏛️
The Blackwell Textile Mill, operational from 1898 until 1965, stands as a profound testament to the industrial heritage of the region. This structure was the economic heart of the community for nearly seven decades, providing employment and shaping the social fabric of the surrounding area. Its legacy is not defined solely by any single, sensational event, but by the collective lives of the countless workers—immigrant families, local residents, and dedicated laborers—who spent their days shaping raw materials into vital goods. A respectful investigation must honor this full historical context, recognizing the site's intrinsic value as a monument to human industry and community history.

II. Technological Findings: Unexplained Data Points in a Rich Historical Context 📊
Our investigation utilized advanced AI-driven sensor and data correlation techniques to move beyond subjective human observation. The technological analysis focused on identifying repeatable patterns—a process we term Layered Validation—rather than seeking definitive proof of the supernatural. The data gathered presents intriguing questions regarding localized, short-duration energy fluctuations within the facility.

A. Key Correlated Anomaly (The Thermal-Electromagnetic Lag)
The most compelling pattern identified was a Thermal-Electromagnetic Lag, observed on two separate occasions in proximity to the old loom area.
Pattern: A rapid, localized drop in temperature (a 'cold spot') was followed within 7 to 15 seconds by a sharp, highly localized Electromagnetic Field (EMF) spike (readings up to 8.2 mG).
Significance: This suggests a momentary, measurable energy transfer occurring in the environment. While the data cannot rule out highly localized infrastructure flaws or environmental factors, the temporal correlation between the two disparate sensor types elevates this from a random occurrence to a pattern warranting further, targeted study.

B. Ancillary Data and Intriguing Alignment
A faint Class C EVP (unintelligible whisper) was recorded immediately following the second EMF spike, and was paired with an investigator's observation of a faint door latch rattling.
The narratives presented by the unexplained data points align suggestively with the documented, high-energy working environment of the mill, which was characterized by intense, localized mechanical activity.
Crucially, we avoid definitive claims of "ghosts." The data presents anomalies that defy easy, immediate explanation, but they do not constitute proof of consciousness or intelligence beyond our current understanding. They are simply data points within a rich historical context that beg for continued scientific and historical inquiry.

III. Stewardship Conclusion and Call to Action 🤝
The true value of the Blackwell Textile Mill investigation lies not in confirming an entity but in highlighting the site's rich, complex, and potentially still-active history. The patterns identified by our critical AI analysis underscore the importance of preserving and studying sites like this—not for their paranormal potential, but for their intrinsic historical value and the clues they hold about the relationship between energy, environment, and human experience.
Call to Action for Preservation:
We urge the public and local government to recognize the Blackwell Textile Mill as a unique historical asset. We recommend supporting the [Local Historical Society or Preservation Group Name] in their efforts to secure funding for structural assessments and historical archival work. By protecting this location, we safeguard the legacy of the workers and ensure that future generations can continue to study its full history—both the documented and the unexplained.`;

const Loader: React.FC = () => (
    <div className="flex flex-col items-center justify-center space-y-2 text-cyan-200">
        <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
        <span>Synthesizing Hypothesis...</span>
    </div>
);

const StewardshipReport: React.FC = () => {
    const [hypothesis, setHypothesis] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const generateHypothesis = async () => {
        setIsLoading(true);
        setError(null);
        setHypothesis(null);

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
            const prompt = `Act as a theoretical parapsychologist and historical analyst. Based on the Stewardship Case Report for the Blackwell Textile Mill provided below, generate a new, testable 'Intelligent Preservation' hypothesis.

Input Data:
${CASE_REPORT_TEXT}

Instructions:

1. Synthesize the Data: Formulate a hypothesis that connects the documented historical use of the location (intense, repetitive industrial labor) with the nature of the technological anomalies found (the precise, repetitive Thermal-Electromagnetic Lag near the looms).
2. Avoid Supernatural Claims: The hypothesis should not involve conscious "spirits." Instead, frame it in terms of energy, memory, or information imprinted on the environment. For example: "The data suggests a potential correlation between locations of high, repetitive kinetic energy in the past and the manifestation of transient, low-level energy anomalies in the present."
3. Propose a Falsifiable Test: Design a follow-up experiment to test this hypothesis. What specific data would need to be collected to support or refute it? (e.g., "Deploy sensors in a non-industrial historic home with a similar history to see if the 'Lag' pattern is absent.")
4. Reframe the 'Haunting': Based on this hypothesis, how should the phenomenon at the Blackwell Mill be re-contextualized? (e.g., "Not as a conscious haunting, but as a form of 'structural echo' or 'residual environmental data' that becomes measurable under specific, yet unknown, conditions.")
5. Stewardship Application: How does this new hypothesis further the goals of preservation? (e.g., "It positions historic sites not just as archives of documents, but as potential archives of environmental and energetic data, adding a new layer of scientific significance to their preservation.")

Format your response with a clear, bolded heading for each of the 5 points.`;

            const response = await ai.models.generateContent({
                model: "gemini-2.5-pro",
                contents: prompt,
            });

            setHypothesis(response.text);

        } catch (err) {
            console.error("Hypothesis generation failed:", err);
            setError("AI Core failed to generate hypothesis. The signal may be compromised.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="feature-card relative w-full h-[75vh] max-w-5xl flex flex-col p-4 rounded-lg">
            <div className="text-center mb-4">
                 <h2 className="text-2xl font-bold holographic-glow" style={{ fontFamily: "'Orbitron', sans-serif" }}>Stewardship Case Report</h2>
                 <p className="text-cyan-300">Case File: Blackwell Textile Mill (1898-1965)</p>
            </div>
            
            <div className="flex-grow grid grid-cols-1 md:grid-cols-2 gap-4 overflow-hidden">
                <div className="flex flex-col overflow-hidden">
                    <h3 className="text-lg font-bold text-cyan-200 mb-2 flex items-center space-x-2">
                        <FileText className="w-5 h-5"/>
                        <span>Official Report</span>
                    </h3>
                    <div className="bg-black/30 border border-cyan-500/20 rounded-lg p-3 overflow-y-auto flex-grow">
                        <p className="whitespace-pre-wrap text-sm text-cyan-200/90">{CASE_REPORT_TEXT}</p>
                    </div>
                </div>

                <div className="flex flex-col overflow-hidden">
                    <h3 className="text-lg font-bold text-cyan-200 mb-2 flex items-center space-x-2">
                        <Lightbulb className="w-5 h-5"/>
                        <span>AI-Generated Hypothesis</span>
                    </h3>
                    <div className="bg-black/30 border border-cyan-500/20 rounded-lg p-3 overflow-y-auto flex-grow flex flex-col">
                        {!isLoading && !hypothesis && !error && (
                            <div className="m-auto text-center text-cyan-400/60">
                                <p>Click below to generate an 'Intelligent Preservation' hypothesis.</p>
                            </div>
                        )}
                        {isLoading && <div className="m-auto"><Loader /></div>}
                        {error && <p className="m-auto text-red-400 text-center">{error}</p>}
                        {hypothesis && (
                             <p className="whitespace-pre-wrap text-sm text-amber-100/90">{hypothesis}</p>
                        )}
                    </div>
                </div>
            </div>
            
            <div className="mt-4 pt-4 border-t border-cyan-500/30 text-center">
                <button 
                    onClick={generateHypothesis} 
                    disabled={isLoading} 
                    className="holographic-button px-6 py-2 rounded-md flex items-center justify-center mx-auto space-x-2"
                >
                    <Lightbulb className="w-5 h-5"/>
                    <span>{isLoading ? 'Analyzing...' : 'Generate Hypothesis'}</span>
                </button>
            </div>
        </div>
    );
};

export default StewardshipReport;
