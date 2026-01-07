
import { GoogleGenAI, Type } from "@google/genai";
import { ServiceNode, Connection } from "./types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export async function analyzeTopology(nodes: ServiceNode[], connections: Connection[]) {
  const prompt = `
    Analyze this system architecture and suggest improvements for reliability and scalability.
    
    Nodes: ${JSON.stringify(nodes.map(n => ({ id: n.id, type: n.type, name: n.name })))}
    Connections: ${JSON.stringify(connections.map(c => ({ from: c.sourceId, to: c.targetId, label: c.label })))}
    
    IMPORTANT: Provide the response in CHINESE.
    Provide a brief JSON summary.
  `;

  try {
    // Using gemini-3-pro-preview for complex architectural analysis
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            score: { type: Type.NUMBER, description: "Architecture health score 0-100" },
            bottlenecks: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Performance bottlenecks in Chinese" },
            recommendations: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Optimization recommendations in Chinese" }
          },
          required: ["score", "bottlenecks", "recommendations"]
        }
      }
    });

    return JSON.parse(response.text?.trim() || "{}");
  } catch (error) {
    console.error("AI Analysis failed:", error);
    return null;
  }
}

export async function suggestLayout(description: string) {
    const prompt = `Based on the description: "${description}", generate a 3D topology layout.
    Return a JSON object with nodes and connections. 
    Positions should be roughly within -10 to 10 on X, Y, Z.
    IMPORTANT: The node names and connection labels should be in CHINESE if applicable.`;

    try {
        // Using gemini-3-pro-preview for complex graph layout logic
        const response = await ai.models.generateContent({
            model: "gemini-3-pro-preview",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        nodes: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    name: { type: Type.STRING, description: "Name in Chinese" },
                                    type: { type: Type.STRING, description: "database, server, gateway, cache, load_balancer, firewall" },
                                    x: { type: Type.NUMBER },
                                    y: { type: Type.NUMBER },
                                    z: { type: Type.NUMBER }
                                },
                                required: ["name", "type", "x", "y", "z"]
                            }
                        },
                        connections: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    sourceIndex: { type: Type.INTEGER },
                                    targetIndex: { type: Type.INTEGER },
                                    label: { type: Type.STRING, description: "Label in Chinese" }
                                },
                                required: ["sourceIndex", "targetIndex", "label"]
                            }
                        }
                    },
                    required: ["nodes", "connections"]
                }
            }
        });

        return JSON.parse(response.text?.trim() || '{"nodes": [], "connections": []}');
    } catch (error) {
        console.error("AI Layout suggestion failed:", error);
        return { nodes: [], connections: [] };
    }
}
