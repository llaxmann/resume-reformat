import React, { useState } from "react";
import axios from "axios";
import mammoth from "mammoth";
import "./App.css"
import * as pdfjsLib from "pdfjs-dist/build/pdf";
import "./MenuStyles.css"; // Import CSS file for styling

const OPENAI_API_KEY = "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"; // Replace with your API key
//const OPENAI_API_KEY = process.env.REACT_APP_OPENAI_API_KEY;

const App = () => {
  const [resumeFile, setResumeFile] = useState(null);
  const [jobDescFile, setJobDescFile] = useState(null);
  const [menuContent, setMenuContent] = useState({});
  const [activeMenu, setActiveMenu] = useState(null);
  const [result, setResult] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(""); 

  // File handlers
  const handleFileChange = (e, type) => {
    if (type === "resume") {
      setResumeFile(e.target.files[0]);
    } else if (type === "jd") {
      setJobDescFile(e.target.files[0]);
    }
  };

  const extractTextFromFile = async (file) => {
    const fileType = file.name.split(".").pop().toLowerCase();

    if (fileType === "txt") {
      return await file.text();
    } else if (fileType === "docx") {
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer });
      return result.value;
    } else if (fileType === "pdf") {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      let text = "";
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        const pageText = content.items.map((item) => item.str).join(" ");
        text += pageText + "\n";
      }
      return text;
    } else {
      throw new Error("Unsupported file type.");
    }
  };

  const toggleMenu = async (menu) => {
    if (!resumeFile) {
      alert("Please upload a resume file before using this feature.");
      return;
    }

    const isSameMenu = activeMenu === menu;
    setActiveMenu(isSameMenu ? null : menu);

    if (!isSameMenu && !menuContent[menu]) {
      setIsLoading(true);

      try {
        const resumeText = await extractTextFromFile(resumeFile);
        const query = generateQuery(menu, resumeText);

        const response = await axios.post(
          "https://api.openai.com/v1/chat/completions",
          {
            model: "gpt-3.5-turbo",
            temperature: 1,
            messages: [
              {
                role: "system",
                content: "You are a professional content generator for resumes.",
              },
              {
                role: "user",
                content: query,
              },
            ],
          },
          {
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${OPENAI_API_KEY}`,
            },
          }
        );

        const fetchedContent =
          response.data.choices[0]?.message?.content || "No content available.";
        setMenuContent((prevContent) => ({
          ...prevContent,
          [menu]: fetchedContent,
        }));
      } catch (error) {
        console.error("Error fetching content from ChatGPT:", error);
        setMenuContent((prevContent) => ({
          ...prevContent,
          [menu]: "Error fetching content. Please try again later.",
        }));
      } finally {
        setIsLoading(false);
      }
    }
  };

  const generateQuery = (menu, resumeText, jdText) => {
    switch (menu) {
      case "Profile Summary":
        return `Using the following resume content, write a concise and professional profile summary:\n\n${resumeText}${jdText}`;
      case "Achievements":
        return `List key achievements from the following resume:\n\n${resumeText}${jdText}`;
      case "Education":
        return `Extract and format education details from the following resume:\n\n${resumeText}`;
      case "Employment Summary":
        return `Create a Employment summary from the following resume:\n\n${resumeText}${jdText}`;
      case "Core Competencies":
        return `List core competencies from the following resume:\n\n${resumeText}${jdText}`;
      case "Technical Skills":
        return `List technical skills from the following resume:\n\n${resumeText}${jdText}`;
      case "Select Experience":
        return `Summarize work experiences from the following resume:\n\n${resumeText}${jdText}`;
      case "Personal Particulars":
        return `Extract personal particulars from the following resume:\n\n${resumeText}`;
      default:
        return "Provide general content for this section of the resume.";
    }
  };

  const handleAnalysis = async () => {
    if (!resumeFile || !jobDescFile) {
      alert("Please upload both a resume and a job description.");
      return;
    }

    setIsLoading(true);

    try {
      const resumeText = await extractTextFromFile(resumeFile);
      const jdText = await extractTextFromFile(jobDescFile);

      const response = await axios.post(
        "https://api.openai.com/v1/chat/completions",
        {
          model: "gpt-3.5-turbo",
          temperature: 1,
          messages: [
            {
              role: "system",
              content: "You are an expert in resume analysis.",
            },
            {
              role: "user",
              content: `Analyze the following resume against this job description and identify gaps:\n\nResume:\n${resumeText}\n\nJob Description:\n${jdText}`,
            },
          ],
        },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${OPENAI_API_KEY}`,
          },
        }
      );

      setAnalysisResult(response.data.choices[0]?.message?.content || "");
    } catch (error) {
      console.error("Error analyzing resume:", error);
      alert("An error occurred while analyzing the resume.");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePrepareReformattedResume = () => {
    const combinedContent = Object.entries(menuContent)
      .map(([section, content]) => `${section}:\n${content}`)
      .join("\n\n");

    setResult(combinedContent);
  };

  return (
    <div className="app-container">
      <h2>Resume Reformatter & Content Generator</h2>

      <div>
        <h3>Upload Files</h3>
        <div>
          <label>
            Upload Resume:
            <input
              type="file"
              accept=".txt,.docx,.pdf"
              onChange={(e) => handleFileChange(e, "resume")}
            />
          </label>
        </div>
        <div>
          <label>
            Upload Job Description:
            <input
              type="file"
              accept=".txt,.docx,.pdf"
              onChange={(e) => handleFileChange(e, "jd")}
            />
          </label>
        </div>
        <button onClick={handleAnalysis} disabled={isLoading}>
          {isLoading ? "Analyzing..." : "Analyze Gaps"}
        </button>
      </div>

      {analysisResult && (
        <div>
          <h3>Analysis Result:</h3>
          <pre>{analysisResult}</pre>
        </div>
      )}

      <div>
        <h3>Resume Sections</h3>
        {[
          "Profile Summary",
          "Achievements",
          "Education",
          "Employment Summary",
          "Core Competencies",
          "Technical Skills",
          "Select Experience",
          "Personal Particulars",
        ].map((menu, index) => (
          <div key={index}>
            <button onClick={() => toggleMenu(menu)}>{menu}</button>
            {activeMenu === menu && (
              <div>
                {isLoading ? "Loading..." : <pre>{menuContent[menu]}</pre>}
              </div>
            )}
          </div>
        ))}
      </div>

      <button onClick={handlePrepareReformattedResume}>
        Prepare Reformatted Resume
      </button>



      {result && (
        <div>
          <h3>Reformatted Resume:</h3>
          <pre>{result}</pre>
        </div>
      )}
    </div>
  );
};

export default App;
