import React, { useState, useEffect } from 'react';
import { Search, Building2, Briefcase, FileText, Brain, Target, CheckCircle, Clock, Star, TrendingUp, Users, Award, KeyRound, X, Loader2 } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

// API Configuration
// const PPLX_API_KEY = process.env.REACT_APP_PPLX_API_KEY;
const API_BASE_URL = 'https://rms-backend-taupe.vercel.app/api';
const RMS_API_KEY = process.env.REACT_APP_RMS_API_KEY;

const InterviewPrepPlatform = () => {
  const [formData, setFormData] = useState({
    companyName: '',
    jobRole: '',
    jobDescription: ''
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [roadmap, setRoadmap] = useState(null);

  // --- STATE FOR USAGE LIMITS AND VERIFICATION ---
  const [usageCount, setUsageCount] = useState(0);
  const [isBlocked, setIsBlocked] = useState(false);
  const [rmsKey, setRmsKey] = useState('');
  const [verifiedKey, setVerifiedKey] = useState(null); // To store the verified key
  const [isVerifyingKey, setIsVerifyingKey] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const FREE_LIMIT = 1;

  // Load usage data and premium status from localStorage on initial render
  useEffect(() => {
    const premiumStatus = localStorage.getItem('isPremiumInterviewPrep') === 'true';
    const storedKey = localStorage.getItem('verifiedRmsKeyInterviewPrep');

    if (premiumStatus && storedKey) {
      setIsPremium(true);
      setVerifiedKey(storedKey);
    } else if (!premiumStatus) {
      const storedUsage = localStorage.getItem('interviewPrepUsage');
      if (storedUsage) {
        setUsageCount(JSON.parse(storedUsage));
      }
    }
  }, []);
  
  const handleVerifyKey = async (e) => {
    e.preventDefault();
    if (!rmsKey || rmsKey.length !== 6) {
      toast.error("Please enter a valid 6-digit key.");
      return;
    }
    setIsVerifyingKey(true);
    try {
      const response = await fetch(`${API_BASE_URL}/user/verify-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userCode: rmsKey })
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Verification failed.');
      }
      toast.success('Verification Successful! You now have unlimited access.');
      setIsPremium(true);
      setVerifiedKey(rmsKey);
      localStorage.setItem('isPremiumInterviewPrep', 'true');
      localStorage.setItem('verifiedRmsKeyInterviewPrep', rmsKey);
      localStorage.removeItem('interviewPrepUsage');
      setIsBlocked(false);
      setRmsKey('');
    } catch (error) {
      toast.error(`Verification Failed: ${error.message}`);
    } finally {
      setIsVerifyingKey(false);
    }
  };

  // --- NEW FUNCTION TO RE-VALIDATE KEY ---
  const revalidateKey = async () => {
    if (!verifiedKey) return false;

    try {
        const response = await fetch(`${API_BASE_URL}/user/check-code`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userCode: verifiedKey })
        });
        const data = await response.json();
        return data.success;
    } catch (error) {
        console.error("Key re-validation failed:", error);
        return false;
    }
  };

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const makePerplexityRequest = async (prompt) => {
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PPLX_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'sonar',
        messages: [
          {
            role: 'system',
            content: 'You are an expert career advisor and interview preparation specialist. Provide detailed, accurate, and current information about companies and roles. Format your response as structured JSON data that can be parsed programmatically.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 4000,
        temperature: 0.3,
        top_p: 0.9,
        stream: false
      })
    });

    if (!response.ok) {
      throw new Error(`Perplexity API error: ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  };

  const parseAIResponse = (content) => {
    try {
      const jsonMatch = content.match(/```json\n?([\s\S]*?)\n?```/) || content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[1] || jsonMatch[0]);
      }
      return parseTextResponse(content);
    } catch (error) {
      console.error('Error parsing AI response:', error);
      return parseTextResponse(content);
    }
  };

  const parseTextResponse = (content) => {
    return {
      companyOverview: {
        name: formData.companyName,
        industry: "Technology",
        size: "Large",
        culture: "Innovative and fast-paced",
        recentNews: "Launched new AI initiatives."
      },
      roleAnalysis: {
        title: formData.jobRole,
        department: "Engineering",
        level: "Mid-Senior",
        reportingStructure: "Reports to Engineering Manager",
        teamSize: "5-10 people",
        workStyle: "Hybrid"
      },
      basicTopics: [{ category: "Technical", topics: ["Data Structures", "Algorithms"] }],
      advancedTopics: [{ category: "System Design", topics: ["Scalability", "Microservices"] }],
      interviewFocus: ["Problem Solving", "System Design", "Behavioral Questions"],
      preparationPlan: { week1: "...", week2: "...", week3: "...", week4: "..." },
      keyInsights: ["Focus on impact", "Show curiosity"]
    };
  };

  const generateRoadmap = async () => {
    if (!formData.companyName || !formData.jobRole) {
      toast.error('Please fill in at least company name and job role');
      return;
    }

    // --- UPDATED LOGIC WITH RE-VALIDATION ---
    if (isPremium) {
        const isKeyStillValid = await revalidateKey();
        if (!isKeyStillValid) {
            toast.error("Your key has expired. Please enter a new one.");
            setIsPremium(false);
            setVerifiedKey(null);
            localStorage.removeItem('isPremiumInterviewPrep');
            localStorage.removeItem('verifiedRmsKeyInterviewPrep');
            setIsBlocked(true);
            return;
        }
    } else if (usageCount >= FREE_LIMIT) {
        toast.error("You've reached your free generation limit.");
        setIsBlocked(true);
        return;
    }

    setIsGenerating(true);
    
    try {
      const prompt = `
        Create a comprehensive interview preparation roadmap for a ${formData.jobRole} position at ${formData.companyName}.
        Company: ${formData.companyName}
        Role: ${formData.jobRole}
        ${formData.jobDescription ? `Job Description: ${formData.jobDescription}` : ''}
        
        Provide detailed information and format the response as structured JSON with the following structure:
        {
          "companyOverview": {"name": "${formData.companyName}", "industry": "...", "size": "...", "culture": "...", "recentNews": "..."},
          "roleAnalysis": {"title": "${formData.jobRole}", "department": "...", "level": "...", "reportingStructure": "...", "teamSize": "...", "workStyle": "..."},
          "basicTopics": [{"category": "...", "topics": ["..."]}],
          "advancedTopics": [{"category": "...", "topics": ["..."]}],
          "interviewFocus": ["..."],
          "preparationPlan": {"week1": "...", "week2": "...", "week3": "...", "week4": "..."},
          "keyInsights": ["..."]
        }
        Make sure all information is current, accurate, and specific.
      `;

      const aiResponse = await makePerplexityRequest(prompt);
      const parsedRoadmap = parseAIResponse(aiResponse);
      
      setRoadmap(parsedRoadmap);
      if (!isPremium) {
        const newCount = usageCount + 1;
        setUsageCount(newCount);
        localStorage.setItem('interviewPrepUsage', JSON.stringify(newCount));
      }
    } catch (error) {
      console.error('Error generating roadmap:', error);
      toast.error('Error generating roadmap. Please check your internet connection and try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const VerificationModal = () => (
    <AnimatePresence>
        {isBlocked && (
            <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            >
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    className="bg-white rounded-2xl p-8 shadow-xl max-w-md w-full relative"
                >
                    <button onClick={() => setIsBlocked(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
                        <X size={24} />
                    </button>
                    <div className="text-center">
                        <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                            <KeyRound className="w-8 h-8 text-white" />
                        </div>
                        <h2 className="text-2xl font-bold text-gray-900">Free Limit Reached</h2>
                        <p className="text-gray-600 mt-2 mb-6">
                            Please enter your RMS Key for unlimited roadmap generations.
                        </p>
                        <form onSubmit={handleVerifyKey} className="space-y-4">
                            <input
                                type="text"
                                value={rmsKey}
                                onChange={(e) => setRmsKey(e.target.value.replace(/\D/g, ''))}
                                maxLength="6"
                                className="w-full text-center text-xl font-mono tracking-widest px-4 py-2 bg-gray-100 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="_ _ _ _ _ _"
                                required
                            />
                            <button
                                type="submit"
                                disabled={isVerifyingKey}
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors disabled:bg-gray-400"
                            >
                                {isVerifyingKey ? <Loader2 className="w-5 h-5 animate-spin" /> : <span>Unlock Now</span>}
                            </button>
                        </form>
                        <p className="text-xs text-center text-gray-500 mt-4">
                            Don't have a key? <a href="/GetRMSKey" className="text-blue-600 hover:underline">Get one here</a>.
                        </p>
                    </div>
                </motion.div>
            </motion.div>
        )}
    </AnimatePresence>
  );

  return (
  <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50">
      <Toaster position="top-center" />
      <VerificationModal />

      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-pulse animation-delay-2000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-100 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse animation-delay-4000"></div>
      </div>

      <div className="relative z-10">
        <header className="px-2 sm:px-6 py-10 sm:py-16">
          <div className="max-w-7xl mx-auto text-center">
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
              <div className="p-4 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl shadow-lg mb-4 sm:mb-0">
                <Brain className="w-10 h-10 text-white" />
              </div>
              <div className="text-center sm:text-left">
                <h1 className="text-3xl sm:text-5xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
                  Interview Prep Pro
                </h1>
                <p className="text-gray-600 text-lg sm:text-xl mt-2">AI-Powered Deep Research & Roadmap Generator</p>
              </div>
            </div>
            <div className="max-w-3xl mx-auto">
              <p className="text-gray-700 text-base sm:text-lg leading-relaxed">
                Get personalized interview preparation roadmaps with deep company insights, role-specific guidance, 
                and comprehensive study plans powered by advanced AI research.
              </p>
            </div>
          </div>
        </header>

        <div className="max-w-7xl mx-auto px-2 sm:px-6 pb-10 sm:pb-16">
          <div className="mb-10 sm:mb-16">
            <div className="bg-white/80 backdrop-blur-lg rounded-3xl p-4 sm:p-10 border border-gray-200 shadow-xl">
              <div className="text-center mb-6 sm:mb-8">
                <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-3 sm:mb-4">Start Your Interview Preparation Journey</h2>
                <p className="text-gray-600 text-base sm:text-lg">Enter your target company and role to get a personalized research roadmap</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-8 mb-6 sm:mb-8">
                <div className="space-y-2 sm:space-y-3">
                  <label className="flex items-center text-gray-700 font-semibold text-sm uppercase tracking-wider">
                    <Building2 className="w-5 h-5 mr-2 text-blue-500" />
                    Company Name
                  </label>
                  <input
                    type="text"
                    name="companyName"
                    value={formData.companyName}
                    onChange={handleInputChange}
                    placeholder="e.g., Google, Microsoft, Amazon, Tesla"
                    className="w-full px-4 py-3 sm:px-5 sm:py-4 bg-gray-50 border-2 border-gray-200 rounded-xl text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-base"
                  />
                </div>

                <div className="space-y-2 sm:space-y-3">
                  <label className="flex items-center text-gray-700 font-semibold text-sm uppercase tracking-wider">
                    <Briefcase className="w-5 h-5 mr-2 text-purple-500" />
                    Job Role/Position
                  </label>
                  <input
                    type="text"
                    name="jobRole"
                    value={formData.jobRole}
                    onChange={handleInputChange}
                    placeholder="e.g., Software Engineer, Product Manager"
                    className="w-full px-4 py-3 sm:px-5 sm:py-4 bg-gray-50 border-2 border-gray-200 rounded-xl text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200 text-base"
                  />
                </div>
              </div>

              <div className="space-y-2 sm:space-y-3 mb-6 sm:mb-10">
                <label className="flex items-center text-gray-700 font-semibold text-sm uppercase tracking-wider">
                  <FileText className="w-5 h-5 mr-2 text-indigo-500" />
                  Job Description (Optional)
                </label>
                <textarea
                  name="jobDescription"
                  value={formData.jobDescription}
                  onChange={handleInputChange}
                  placeholder="Paste the job description here for more targeted insights..."
                  rows="4"
                  className="w-full px-4 py-3 sm:px-5 sm:py-4 bg-gray-50 border-2 border-gray-200 rounded-xl text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 resize-none text-base"
                />
              </div>

              <button
                onClick={generateRoadmap}
                disabled={isGenerating}
                className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white font-bold py-4 sm:py-5 px-6 sm:px-8 rounded-xl hover:from-blue-600 hover:to-purple-700 transition-all duration-200 transform hover:scale-105 hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2 sm:gap-4 text-base sm:text-lg"
              >
                {isGenerating ? (
                  <>
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                    <span>Generating Comprehensive Research...</span>
                  </>
                ) : (
                  <>
                    <Search className="w-6 h-6" />
                    <span>Generate Deep Research Roadmap</span>
                  </>
                )}
              </button>
              {!isPremium && (
                <p className="text-center text-xs sm:text-sm text-gray-500 mt-3 sm:mt-4">
                  You have {Math.max(0, FREE_LIMIT - usageCount)} free generation remaining.
                </p>
              )}
            </div>
          </div>

          {roadmap && (
            <div className="space-y-8 sm:space-y-10">
              {/* Company Overview */}
              <div className="bg-white/90 backdrop-blur-lg rounded-3xl p-4 sm:p-10 border border-gray-200 shadow-xl">
                <div className="flex flex-col sm:flex-row items-center mb-6 sm:mb-8 gap-4">
                  <div className="p-3 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl mr-4">
                    <Building2 className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <h2 className="text-3xl font-bold text-gray-800">Company Intelligence</h2>
                    <p className="text-gray-600 mt-1">Deep insights about {roadmap.companyOverview.name}</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-8">
                  <div className="bg-blue-50 rounded-2xl p-6 border-l-4 border-blue-500">
                    <p className="text-blue-600 text-sm font-bold uppercase tracking-wider mb-2">Industry</p>
                    <p className="text-gray-800 font-semibold text-lg">{roadmap.companyOverview.industry}</p>
                  </div>
                  <div className="bg-green-50 rounded-2xl p-6 border-l-4 border-green-500">
                    <p className="text-green-600 text-sm font-bold uppercase tracking-wider mb-2">Company Size</p>
                    <p className="text-gray-800 font-semibold text-lg">{roadmap.companyOverview.size}</p>
                  </div>
                  <div className="bg-purple-50 rounded-2xl p-6 border-l-4 border-purple-500">
                    <p className="text-purple-600 text-sm font-bold uppercase tracking-wider mb-2">Culture</p>
                    <p className="text-gray-800 font-semibold">{roadmap.companyOverview.culture}</p>
                  </div>
                  <div className="bg-orange-50 rounded-2xl p-6 border-l-4 border-orange-500">
                    <p className="text-orange-600 text-sm font-bold uppercase tracking-wider mb-2">Recent Updates</p>
                    <p className="text-gray-800 font-medium text-sm">{roadmap.companyOverview.recentNews}</p>
                  </div>
                </div>
              </div>

              {/* Role Analysis */}
              <div className="bg-white/90 backdrop-blur-lg rounded-3xl p-4 sm:p-10 border border-gray-200 shadow-xl">
                <div className="flex flex-col sm:flex-row items-center mb-6 sm:mb-8 gap-4">
                  <div className="p-3 bg-gradient-to-r from-purple-500 to-pink-600 rounded-xl mr-4">
                    <Target className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <h2 className="text-3xl font-bold text-gray-800">Role Deep Dive</h2>
                    <p className="text-gray-600 mt-1">Everything about the {roadmap.roleAnalysis.title} position</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-8">
                  <div className="space-y-6">
                    <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-6">
                      <p className="text-purple-600 text-sm font-bold uppercase tracking-wider mb-2">Experience Level</p>
                      <p className="text-gray-800 font-semibold text-lg">{roadmap.roleAnalysis.level}</p>
                    </div>
                    <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl p-6">
                      <p className="text-blue-600 text-sm font-bold uppercase tracking-wider mb-2">Department</p>
                      <p className="text-gray-800 font-semibold text-lg">{roadmap.roleAnalysis.department}</p>
                    </div>
                  </div>
                  <div className="space-y-6">
                    <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-6">
                      <p className="text-green-600 text-sm font-bold uppercase tracking-wider mb-2">Team Size</p>
                      <p className="text-gray-800 font-semibold text-lg">{roadmap.roleAnalysis.teamSize}</p>
                    </div>
                    <div className="bg-gradient-to-r from-orange-50 to-red-50 rounded-xl p-6">
                      <p className="text-orange-600 text-sm font-bold uppercase tracking-wider mb-2">Reporting Structure</p>
                      <p className="text-gray-800 font-semibold">{roadmap.roleAnalysis.reportingStructure}</p>
                    </div>
                  </div>
                  <div className="space-y-6">
                    <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-6">
                      <p className="text-indigo-600 text-sm font-bold uppercase tracking-wider mb-2">Work Style</p>
                      <p className="text-gray-800 font-semibold">{roadmap.roleAnalysis.workStyle}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Basic Topics */}
              <div className="bg-white/90 backdrop-blur-lg rounded-3xl p-4 sm:p-10 border border-gray-200 shadow-xl">
                <div className="flex flex-col sm:flex-row items-center mb-6 sm:mb-8 gap-4">
                  <div className="p-3 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl mr-4">
                    <CheckCircle className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <h2 className="text-3xl font-bold text-gray-800">Essential Foundation</h2>
                    <p className="text-gray-600 mt-1">Core topics you must master before the interview</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-10">
                  {roadmap.basicTopics.map((section, index) => (
                    <div key={index} className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-8 border border-green-200">
                      <h3 className="text-xl font-bold text-green-700 mb-6 flex items-center">
                        <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
                        {section.category}
                      </h3>
                      <ul className="space-y-3">
                        {section.topics.map((topic, topicIndex) => (
                          <li key={topicIndex} className="flex items-start text-gray-700">
                            <CheckCircle className="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                            <span className="font-medium">{topic}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>

              {/* Advanced Topics */}
              <div className="bg-white/90 backdrop-blur-lg rounded-3xl p-4 sm:p-10 border border-gray-200 shadow-xl">
                <div className="flex flex-col sm:flex-row items-center mb-6 sm:mb-8 gap-4">
                  <div className="p-3 bg-gradient-to-r from-yellow-500 to-orange-600 rounded-xl mr-4">
                    <Star className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <h2 className="text-3xl font-bold text-gray-800">Advanced Mastery</h2>
                    <p className="text-gray-600 mt-1">Cutting-edge skills to set you apart from other candidates</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-10">
                  {roadmap.advancedTopics.map((section, index) => (
                    <div key={index} className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-2xl p-8 border border-yellow-200">
                      <h3 className="text-xl font-bold text-orange-700 mb-6 flex items-center">
                        <div className="w-3 h-3 bg-orange-500 rounded-full mr-3"></div>
                        {section.category}
                      </h3>
                      <ul className="space-y-3">
                        {section.topics.map((topic, topicIndex) => (
                          <li key={topicIndex} className="flex items-start text-gray-700">
                            <Star className="w-5 h-5 text-orange-500 mr-3 mt-0.5 flex-shrink-0" />
                            <span className="font-medium">{topic}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>

              {/* Interview Focus */}
              <div className="bg-white/90 backdrop-blur-lg rounded-3xl p-4 sm:p-10 border border-gray-200 shadow-xl">
                <div className="flex flex-col sm:flex-row items-center mb-6 sm:mb-8 gap-4">
                  <div className="p-3 bg-gradient-to-r from-red-500 to-pink-600 rounded-xl mr-4">
                    <Users className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <h2 className="text-3xl font-bold text-gray-800">Interview Focus Areas</h2>
                    <p className="text-gray-600 mt-1">What to expect and prepare for in your actual interviews</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                  {roadmap.interviewFocus.map((focus, index) => (
                    <div key={index} className="bg-gradient-to-r from-red-50 to-pink-50 border-2 border-red-200 rounded-xl p-6 hover:shadow-lg transition-shadow duration-200">
                      <div className="flex items-start">
                        <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center text-white font-bold text-sm mr-4 flex-shrink-0">
                          {index + 1}
                        </div>
                        <p className="text-gray-800 font-semibold leading-relaxed">{focus}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Preparation Timeline */}
              <div className="bg-white/90 backdrop-blur-lg rounded-3xl p-4 sm:p-10 border border-gray-200 shadow-xl">
                <div className="flex flex-col sm:flex-row items-center mb-6 sm:mb-8 gap-4">
                  <div className="p-3 bg-gradient-to-r from-indigo-500 to-blue-600 rounded-xl mr-4">
                    <Clock className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <h2 className="text-3xl font-bold text-gray-800">4-Week Strategic Preparation Plan</h2>
                    <p className="text-gray-600 mt-1">Structured timeline to maximize your interview success</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-8">
                  {Object.entries(roadmap.preparationPlan).map(([week, plan], index) => (
                    <div key={index} className="bg-gradient-to-br from-indigo-50 to-blue-50 border-2 border-indigo-200 rounded-2xl p-8 hover:shadow-lg transition-shadow duration-200">
                      <div className="flex items-center mb-4">
                        <div className="w-12 h-12 bg-gradient-to-r from-indigo-500 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg">
                          {index + 1}
                        </div>
                        <h3 className="text-indigo-700 font-bold text-lg ml-4 capitalize">{week}</h3>
                      </div>
                      <p className="text-gray-700 font-medium leading-relaxed">{plan}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Key Insights */}
              <div className="bg-white/90 backdrop-blur-lg rounded-3xl p-4 sm:p-10 border border-gray-200 shadow-xl">
                <div className="flex flex-col sm:flex-row items-center mb-6 sm:mb-8 gap-4">
                  <div className="p-3 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-xl mr-4">
                    <Award className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <h2 className="text-3xl font-bold text-gray-800">Key Success Insights</h2>
                    <p className="text-gray-600 mt-1">Critical factors that will make you stand out as a candidate</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                  {roadmap.keyInsights.map((insight, index) => (
                    <div key={index} className="flex items-start space-x-4 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl p-6 border border-purple-200">
                      <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-full flex items-center justify-center flex-shrink-0">
                        <Award className="w-4 h-4 text-white" />
                      </div>
                      <p className="text-gray-800 font-semibold leading-relaxed">{insight}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Success Tips */}
              <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-3xl p-4 sm:p-10 text-white shadow-xl">
                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-white/20 rounded-full mb-6">
                    <TrendingUp className="w-8 h-8 text-white" />
                  </div>
                  <h2 className="text-3xl font-bold mb-4">You're Ready to Excel!</h2>
                  <p className="text-xl text-green-100 max-w-3xl mx-auto leading-relaxed">
                    With this comprehensive roadmap, you have everything you need to prepare thoroughly and confidently. 
                    Remember to practice consistently, stay curious, and showcase your unique value proposition during the interview.
                  </p>
                  <div className="mt-6 sm:mt-8 flex flex-wrap justify-center gap-2 sm:gap-4">
                    <div className="bg-white/20 rounded-full px-4 py-2 sm:px-6 sm:py-3">
                      <span className="font-semibold">✨ Deep Research Complete</span>
                    </div>
                    <div className="bg-white/20 rounded-full px-4 py-2 sm:px-6 sm:py-3">
                      <span className="font-semibold">🎯 Role-Specific Guidance</span>
                    </div>
                    <div className="bg-white/20 rounded-full px-4 py-2 sm:px-6 sm:py-3">
                      <span className="font-semibold">📚 Structured Learning Path</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default InterviewPrepPlatform;
