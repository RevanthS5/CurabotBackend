const asyncHandler = require("express-async-handler");
const { Groq } = require("groq-sdk");
const Chat = require("../models/Chat.js");
const Doctor = require("../models/Doctor.js");
const Schedule = require("../models/Schedule.js");
const Appointment = require("../models/Appointment.js");
const User = require("../models/User.js");
const mongoose = require("mongoose");

// ✅ Initialize Groq SDK
let groq;
try {
  groq = new Groq({
    apiKey: process.env.GROQ_API_KEY,
  });
  console.log("✅ Groq client initialized successfully for Chatbot");
} catch (error) {
  console.error("❌ Failed to initialize Groq client:", error);
}

// Simple in-memory conversation state tracker (will reset on server restart)
const conversationState = new Map();

// ✅ Determine user intent using LLM
const determineUserIntent = async (message) => {
  const prompt = `
  You are an AI assistant for a healthcare application. Analyze the following user message and determine the user's intent.
  
  User message: "${message}"
  
  Identify the primary intent from these categories:
  1. symptom_analysis - User is describing symptoms or health concerns
  2. doctor_availability - User is asking when a doctor is available (extract doctorId if mentioned and date if specified)
  3. appointment_info - User is asking about their appointment details (extract appointmentId if mentioned)
  4. doctor_info - User is asking about a specific doctor's information (extract doctorId)
  5. reschedule_request - User wants to reschedule an appointment (extract appointmentId, newDate, newTime if mentioned)
  6. general_question - User is asking a general healthcare question
  7. medication_reminder - User wants to set or check medication reminders (extract medicationName and time if mentioned)
  8. health_tips - User is asking for health tips or advice (extract category if mentioned)
  9. emergency_info - User is asking about emergency services or procedures
  10. user_profile - User wants to see or update their profile information
  
  Respond in JSON format:
  {
    "type": "intent_type",
    "doctorId": "doctor_id_if_mentioned_or_null",
    "appointmentId": "appointment_id_if_mentioned_or_null",
    "date": "date_if_mentioned_or_null",
    "newDate": "new_date_if_mentioned_for_reschedule_or_null",
    "newTime": "new_time_if_mentioned_for_reschedule_or_null",
    "medicationName": "medication_name_if_mentioned_or_null",
    "time": "time_if_mentioned_for_medication_or_null",
    "category": "health_tip_category_if_mentioned_or_null"
  }
  `;

  try {
    const response = await groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "llama-3.1-8b-instant",
      temperature: 0.2,
      max_tokens: 500,
      response_format: { type: "json_object" }
    });

    return JSON.parse(response.choices[0].message.content);
  } catch (error) {
    console.error("Error determining intent:", error);
    return { type: "general_question" };
  }
};

// ✅ Enhanced AI-Powered Medical Assistant with Multiple Capabilities
const processUserQuery = async (userId, message) => {
  // Get all doctors for reference
  const doctors = await getAllDoctors();
  
  // Extract intent from user message
  const intent = await determineUserIntent(message);
  
  // Process based on intent
  switch (intent.type) {
    case "symptom_analysis":
      return await handleSymptomAnalysis(userId, message, doctors);
    case "doctor_availability":
      return await handleDoctorAvailability(intent.doctorId, intent.date);
    case "appointment_info":
      return await handleAppointmentInfo(userId, intent.appointmentId);
    case "doctor_info":
      return await handleDoctorInfo(intent.doctorId);
    case "reschedule_request":
      return await handleRescheduleRequest(userId, intent.appointmentId, intent.newDate, intent.newTime);
    case "general_question":
      return await handleGeneralQuestion(message);
    case "medication_reminder":
      return await handleMedicationReminder(userId, intent.medicationName, intent.time);
    case "health_tips":
      return await handleHealthTips(intent.category);
    case "emergency_info":
      return await handleEmergencyInfo();
    case "user_profile":
      return await handleUserProfile(userId);
    default:
      return {
        message: "I'm not sure how to help with that. You can ask me about doctor availability, your appointments, describe your symptoms, or ask for health tips.",
        suggestions: [
          "Find a doctor for my headache",
          "When is my next appointment?",
          "Show me my profile",
          "Give me health tips"
        ]
      };
  }
};

// ✅ Handle symptom analysis (existing functionality enhanced)
const handleSymptomAnalysis = async (userId, message, doctors) => {
  // Initialize or get conversation state
  if (!conversationState.has(userId)) {
    conversationState.set(userId, {
      stage: 'initial',
      symptoms: [],
      followUpCount: 0,
      responses: []
    });
  }
  
  const state = conversationState.get(userId);
  
  try {
    // Get user info for personalization
    const user = await User.findById(userId);
    const userName = user ? user.name : null;
    
    // Add user's response to the state
    state.responses.push(message);
    
    // If we're in the initial stage or still asking follow-up questions
    if (state.stage === 'initial' || state.followUpCount < 2) {
      // Update the symptoms list with the current message
      state.symptoms.push(message);
      
      // If we're just starting, ask the first follow-up question
      if (state.stage === 'initial') {
        state.stage = 'follow_up';
        state.followUpCount = 1;
        
        // Generate a follow-up question
        const analysis = await generateFollowUpQuestion(state.symptoms, 1);
        return { 
          response: userName ? `${userName}, ${analysis.question}` : analysis.question
        };
      }
      // If we've asked one question but not two yet
      else if (state.followUpCount === 1) {
        state.followUpCount = 2;
        
        // Generate the second follow-up question
        const analysis = await generateFollowUpQuestion(state.symptoms, 2);
        return { 
          response: userName ? `${userName}, ${analysis.question}` : analysis.question
        };
      }
    }
    
    // After two follow-up questions, recommend doctors
    state.stage = 'recommendation';
    
    // Get doctor recommendations based on all collected information
    const doctorRecommendations = await getDoctorRecommendations(state.symptoms, doctors);
    
    // Reset the conversation state for this user
    conversationState.delete(userId);
    
    // Return the structured doctor recommendations
    return {
      message: doctorRecommendations.reassurance || "Based on what you've described, here are some doctors who might be able to help:",
      doctors: doctorRecommendations.recommendedDoctors.map(doc => ({
        id: doc.id,
        name: doc.name,
        speciality: doc.speciality,
        qualification: doc.qualification,
        reasoning: doc.reasoning
      })),
      note: "Remember, this is just a suggestion based on the information provided. A proper medical consultation is always recommended."
    };
  } catch (error) {
    console.error("Error in symptom analysis:", error);
    // Reset conversation state on error
    conversationState.delete(userId);
    return { 
      response: "I'm sorry, I'm having trouble analyzing your symptoms right now. This could be due to a technical issue. You can try again or describe your symptoms differently."
    };
  }
};

// Generate a follow-up question based on symptoms
const generateFollowUpQuestion = async (symptoms, questionNumber) => {
  const prompt = `
  You are a medical assistant AI that helps understand patient symptoms.
  
  Patient has described: "${symptoms.join(". ")}"
  
  Generate follow-up question #${questionNumber} of 2 to better understand their condition.
  Make this question conversational, specific, and focused on gathering important medical information.
  The question should be direct and easy to answer.
  
  Return ONLY the question text in JSON format:
  {
    "question": "your follow-up question here"
  }
  `;
  
  try {
    const response = await groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "llama-3.1-8b-instant",
      temperature: 0.3,
      max_tokens: 200,
      response_format: { type: "json_object" }
    });
    
    return JSON.parse(response.choices[0].message.content);
  } catch (error) {
    console.error("Error generating follow-up question:", error);
    return { 
      question: questionNumber === 1 
        ? "Can you tell me when these symptoms started and how severe they are?" 
        : "Are you experiencing any other symptoms like fever, nausea, or dizziness?"
    };
  }
};

// Get doctor recommendations based on all symptoms
const getDoctorRecommendations = async (symptoms, doctorList) => {
  const prompt = `
  You are a medical assistant AI that helps recommend the best doctors based on patient symptoms.
  
  Patient has described: "${symptoms.join(". ")}"
  
  Here is the list of available doctors:
  ${doctorList.map(doc => `
    ID: ${doc._id}
    Name: ${doc.name}
    Speciality: ${doc.speciality}
    Qualification: ${doc.qualification}
    Expertise: ${doc.expertise.join(", ")}
    Overview: ${doc.overview.substring(0, 300)}...
  `).join("\n\n")}
  
  Based on the symptoms described, recommend the 3 most suitable doctors.
  Provide a brief, empathetic reassurance message and a simple 2-line reasoning for each doctor.
  
  Respond in JSON format:
  {
    "reassurance": "Brief empathetic reassurance",
    "recommendedDoctors": [
      {
        "id": "doctor_id_1",
        "name": "Doctor's Name",
        "speciality": "Doctor's Speciality",
        "qualification": "Doctor's Qualification",
        "reasoning": "Simple reason (2 lines max)"
      },
      {
        "id": "doctor_id_2",
        "name": "Doctor's Name",
        "speciality": "Doctor's Speciality",
        "qualification": "Doctor's Qualification",
        "reasoning": "Simple reason (2 lines max)"
      },
      {
        "id": "doctor_id_3",
        "name": "Doctor's Name",
        "speciality": "Doctor's Speciality",
        "qualification": "Doctor's Qualification",
        "reasoning": "Simple reason (2 lines max)"
      }
    ]
  }
  `;
  
  try {
    const response = await groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "llama-3.1-8b-instant",
      temperature: 0.4,
      max_tokens: 1024,
      response_format: { type: "json_object" }
    });
    
    return JSON.parse(response.choices[0].message.content);
  } catch (error) {
    console.error("Error getting doctor recommendations:", error);
    return {
      reassurance: "I've analyzed your symptoms and found some doctors who might be able to help.",
      recommendedDoctors: doctorList.slice(0, 3).map(doc => ({
        id: doc._id,
        name: doc.name,
        speciality: doc.speciality,
        qualification: doc.qualification,
        reasoning: "This doctor specializes in conditions similar to what you've described."
      }))
    };
  }
};

// ✅ NEW: Handle doctor availability queries
const handleDoctorAvailability = async (doctorId, date) => {
  try {
    // If doctorId is a name or partial name, try to find the doctor
    let doctor;
    if (!mongoose.Types.ObjectId.isValid(doctorId)) {
      const doctors = await Doctor.find({
        name: { $regex: doctorId, $options: 'i' }
      });
      
      if (doctors.length === 0) {
        return { 
          response: `I couldn't find a doctor matching "${doctorId}". Could you please provide the full name or try another doctor?` 
        };
      } else if (doctors.length > 1) {
        let response = "I found multiple doctors matching that name. Which one did you mean?\n\n";
        doctors.forEach((doc, index) => {
          response += `${index + 1}. Dr. ${doc.name} (${doc.speciality}, ${doc.qualification})\n`;
        });
        return { response };
      }
      
      doctor = doctors[0];
      doctorId = doctor._id;
    } else {
      doctor = await Doctor.findById(doctorId);
      if (!doctor) {
        return { response: "I couldn't find that doctor in our system." };
      }
    }
    
    // Get doctor's schedule
    const schedule = await Schedule.findOne({ doctorId });
    if (!schedule || !schedule.availableSlots || schedule.availableSlots.length === 0) {
      return { 
        response: `Dr. ${doctor.name} doesn't have any available slots in the schedule yet.` 
      };
    }
    
    // Filter by date if provided
    let availableSlots = schedule.availableSlots;
    if (date) {
      const targetDate = new Date(date);
      availableSlots = availableSlots.filter(slot => {
        const slotDate = new Date(slot.date);
        return slotDate.toDateString() === targetDate.toDateString();
      });
      
      if (availableSlots.length === 0) {
        return { 
          response: `Dr. ${doctor.name} doesn't have any available slots on ${new Date(date).toDateString()}.` 
        };
      }
    } else {
      // If no date provided, get the next 5 days with availability
      availableSlots = availableSlots
        .filter(slot => new Date(slot.date) >= new Date())
        .sort((a, b) => new Date(a.date) - new Date(b.date))
        .slice(0, 5);
    }
    
    // Format the response as a string
    let response = `Here's Dr. ${doctor.name}'s availability:\n\n`;
    
    availableSlots.forEach(slot => {
      const slotDate = new Date(slot.date);
      const availableTimes = slot.times
        .filter(time => !time.isBooked)
        .map(time => time.time);
      
      if (availableTimes.length > 0) {
        response += `${slotDate.toDateString()}: ${availableTimes.join(", ")}\n`;
      }
    });
    
    return { response };
  } catch (error) {
    console.error("Error handling doctor availability:", error);
    return { response: "I'm having trouble checking the doctor's availability right now. Please try again later." };
  }
};

// ✅ NEW: Handle appointment information queries
const handleAppointmentInfo = async (userId, appointmentId) => {
  try {
    let query = { patientId: userId };
    
    // If specific appointment ID is provided
    if (appointmentId && mongoose.Types.ObjectId.isValid(appointmentId)) {
      query._id = appointmentId;
    }
    
    // Find appointments
    const appointments = await Appointment.find(query)
      .sort({ date: 1 })
      .populate('doctorId', 'name speciality qualification')
      .limit(5);
    
    if (appointments.length === 0) {
      return { response: "You don't have any upcoming appointments scheduled." };
    }
    
    let response = appointmentId ? "Here's your appointment information:\n\n" : "Here are your upcoming appointments:\n\n";
    
    appointments.forEach((appt, index) => {
      response += `${index + 1}. Dr. ${appt.doctorId.name} (${appt.doctorId.speciality})\n`;
      response += `   Date: ${new Date(appt.date).toDateString()}\n`;
      response += `   Time: ${appt.time}\n`;
      response += `   Status: ${appt.status}\n\n`;
    });
    
    return { response };
  } catch (error) {
    console.error("Error handling appointment info:", error);
    return { response: "I'm having trouble retrieving your appointment information right now. Please try again later." };
  }
};

// ✅ NEW: Handle doctor information queries
const handleDoctorInfo = async (doctorId) => {
  try {
    // If doctorId is a name or partial name, try to find the doctor
    let doctor;
    if (!mongoose.Types.ObjectId.isValid(doctorId)) {
      const doctors = await Doctor.find({
        name: { $regex: doctorId, $options: 'i' }
      });
      
      if (doctors.length === 0) {
        return { 
          response: `I couldn't find a doctor matching "${doctorId}". Could you please provide the full name or try another doctor?` 
        };
      } else if (doctors.length > 1) {
        let response = "I found multiple doctors matching that name. Which one did you mean?\n\n";
        doctors.forEach((doc, index) => {
          response += `${index + 1}. Dr. ${doc.name} (${doc.speciality}, ${doc.qualification})\n`;
        });
        return { response };
      }
      
      doctor = doctors[0];
    } else {
      doctor = await Doctor.findById(doctorId);
      if (!doctor) {
        return { response: "I couldn't find that doctor in our system." };
      }
    }
    
    // Get doctor's upcoming availability count
    const schedule = await Schedule.findOne({ doctorId: doctor._id });
    let availabilityCount = 0;
    
    if (schedule && schedule.availableSlots) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      availabilityCount = schedule.availableSlots
        .filter(slot => new Date(slot.date) >= today)
        .reduce((count, slot) => {
          return count + slot.times.filter(time => !time.isBooked).length;
        }, 0);
    }
    
    let response = `Here's information about Dr. ${doctor.name}:\n\n`;
    response += `Name: Dr. ${doctor.name}\n`;
    response += `Speciality: ${doctor.speciality}\n`;
    response += `Qualification: ${doctor.qualification}\n`;
    response += `Expertise: ${doctor.expertise.join(", ")}\n\n`;
    response += `Overview: ${doctor.overview}\n\n`;
    response += `Available Slots: ${availabilityCount}\n`;
    
    return { response };
  } catch (error) {
    console.error("Error handling doctor info:", error);
    return { response: "I'm having trouble retrieving the doctor's information right now. Please try again later." };
  }
};

// ✅ NEW: Handle appointment reschedule requests
const handleRescheduleRequest = async (userId, appointmentId, newDate, newTime) => {
  try {
    // This is just information - actual rescheduling would be done through the appointment API
    if (!appointmentId || !mongoose.Types.ObjectId.isValid(appointmentId)) {
      return { 
        response: "To reschedule an appointment, please specify which appointment you'd like to change. You can ask me 'What are my appointments?' to see your scheduled appointments first." 
      };
    }
    
    const appointment = await Appointment.findOne({
      _id: appointmentId,
      patientId: userId
    }).populate('doctorId', 'name');
    
    if (!appointment) {
      return { response: "I couldn't find that appointment in your records." };
    }
    
    // If no new date/time specified, just provide info
    if (!newDate && !newTime) {
      return {
        response: `Your appointment with Dr. ${appointment.doctorId.name} is currently scheduled for ${new Date(appointment.date).toDateString()} at ${appointment.time}. To reschedule, please specify a new date and time, or visit the appointments page.`
      };
    }
    
    return {
      response: `I understand you want to reschedule your appointment with Dr. ${appointment.doctorId.name}. To complete the rescheduling process, please use the 'Reschedule' button on the appointments page. I've noted your preferred new date/time.`
    };
  } catch (error) {
    console.error("Error handling reschedule request:", error);
    return { response: "I'm having trouble processing your reschedule request right now. Please try again later or use the appointments page." };
  }
};

// ✅ NEW: Handle general healthcare questions
const handleGeneralQuestion = async (message) => {
  try {
    const prompt = `
    You are a helpful healthcare assistant. Answer the following question with accurate, 
    medically sound information. Keep your answer concise (maximum 3-4 sentences) and helpful.
    If the question requires a doctor's specific medical advice, politely explain that the user 
    should consult with a healthcare professional.
    
    User question: "${message}"
    `;
    
    const response = await groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "llama-3.1-8b-instant",
      temperature: 0.3,
      max_tokens: 300
    });
    
    return { response: response.choices[0].message.content.trim() };
  } catch (error) {
    console.error("Error handling general question:", error);
    return { response: "I'm sorry, I'm having trouble answering your question right now. Please try again later." };
  }
};

// ✅ NEW: Handle medication reminders
const handleMedicationReminder = async (userId, medicationName, time) => {
  try {
    // This is a placeholder for actual medication reminder functionality
    // In a real implementation, you would store this in a database
    
    if (!medicationName) {
      return { response: "I can help you set medication reminders. Please specify which medication you'd like to be reminded about and when." };
    }
    
    if (!time) {
      return { response: `I'll set up a reminder for ${medicationName}. What time would you like to be reminded?` };
    }
    
    // Get user info for personalization
    const user = await User.findById(userId);
    
    return { response: `Great! I've set a reminder for you to take ${medicationName} at ${time}. I'll send you a notification at ${time}, ${user ? user.name : 'there'}. Is there anything else you'd like me to help you with?` };
  } catch (error) {
    console.error("Error handling medication reminder:", error);
    return { response: "I'm having trouble setting up your medication reminder right now. Please try again later." };
  }
};

// ✅ NEW: Handle health tips
const handleHealthTips = async (category) => {
  try {
    let prompt;
    
    if (category) {
      prompt = `
      You are a healthcare assistant providing brief, helpful health tips. 
      Give 3 practical, evidence-based tips about ${category}.
      Each tip should be 1-2 sentences maximum.
      Format as a numbered list.
      `;
    } else {
      prompt = `
      You are a healthcare assistant providing brief, helpful health tips.
      Give 3 practical, evidence-based general health tips that most people would benefit from.
      Each tip should be 1-2 sentences maximum.
      Format as a numbered list.
      `;
    }
    
    const response = await groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "llama-3.1-8b-instant",
      temperature: 0.5,
      max_tokens: 300
    });
    
    const tips = response.choices[0].message.content.trim();
    return { response: category ? `Here are some health tips about ${category}:\n\n${tips}` : `Here are some general health tips:\n\n${tips}` };
  } catch (error) {
    console.error("Error handling health tips:", error);
    return { response: "I'm having trouble retrieving health tips right now. Please try again later." };
  }
};

// ✅ NEW: Handle emergency information
const handleEmergencyInfo = async () => {
  return { response: "For medical emergencies, please call emergency services immediately:\n\n- Call 911 (or your local emergency number) for life-threatening situations\n- For poison control: 1-800-222-1222\n- If you're experiencing severe symptoms, go to the nearest emergency room\n\nThis is general advice and not a substitute for professional medical help. Always call emergency services in critical situations." };
};

// ✅ NEW: Handle user profile information
const handleUserProfile = async (userId) => {
  try {
    const user = await User.findById(userId);
    
    if (!user) {
      return { response: "I couldn't find your user profile. Please try again later or contact support." };
    }
    
    // Get user's appointments
    const appointments = await Appointment.find({ patientId: userId })
      .sort({ date: 1 })
      .populate('doctorId', 'name speciality')
      .limit(3);
    
    const upcomingAppointments = appointments.filter(appt => new Date(appt.date) >= new Date());
    
    let response = `Hello ${user.name}, here's your profile information:\n\n`;
    response += `Name: ${user.name}\n`;
    response += `Email: ${user.email}\n`;
    response += `Phone: ${user.phone}\n`;
    response += `Member since: ${new Date(user.createdAt).toLocaleDateString()}\n\n`;
    
    if (upcomingAppointments.length > 0) {
      response += "Upcoming appointments:\n";
      upcomingAppointments.forEach((appt, index) => {
        response += `${index + 1}. Dr. ${appt.doctorId.name} (${appt.doctorId.speciality}) on ${new Date(appt.date).toDateString()} at ${appt.time}\n`;
      });
    } else {
      response += "You don't have any upcoming appointments.";
    }
    
    return { response };
  } catch (error) {
    console.error("Error handling user profile:", error);
    return { response: "I'm having trouble retrieving your profile information right now. Please try again later." };
  }
};

// ✅ Store Chat in MongoDB
const saveChatMessage = async (userId, sender, message) => {
  let chat = await Chat.findOne({ userId });

  if (!chat) {
    chat = new Chat({ userId, messages: [] });
  }

  chat.messages.push({ sender, message });
  await chat.save();
};

// ✅ Fetch ALL Doctors from MongoDB (LLM Will Decide Best Match)
const getAllDoctors = async () => {
  const doctors = await Doctor.find({});
  return doctors;
};

// ✅ Enhanced Chatbot API: Handles Entire Conversation Flow with Multiple Capabilities
const chatbotResponse = asyncHandler(async (req, res) => {
  const { userId, message } = req.body;

  if (!userId) {
    return res.status(400).json({ message: "User ID is required." });
  }

  // ✅ If no message is provided, greet the user with personalization
  if (!message) {
    try {
      // Get user info for personalized greeting
      const user = await User.findById(userId);
      const greeting = user ? `Hi ${user.name}! I'm CuraBot!` : "Hi there! I'm CuraBot!";
      
      // Get time of day for more human-like greeting
      const hour = new Date().getHours();
      let timeGreeting = "";
      
      if (hour < 12) {
        timeGreeting = "Good morning! ";
      } else if (hour < 18) {
        timeGreeting = "Good afternoon! ";
      } else {
        timeGreeting = "Good evening! ";
      }
      
      const response = timeGreeting + greeting + " How can I assist you today? Please describe your symptoms or health concerns.";
      
      await saveChatMessage(userId, "bot", response);
      return res.status(200).json({ response });
    } catch (error) {
      console.error("Error generating greeting:", error);
      const defaultGreeting = "Hi there! I'm CuraBot! How can I assist you today? Please describe your symptoms or health concerns.";
      
      await saveChatMessage(userId, "bot", defaultGreeting);
      return res.status(200).json({ response: defaultGreeting });
    }
  }

  // ✅ Store user message in chat history
  await saveChatMessage(userId, "user", message);

  try {
    // ✅ Process the user's query with enhanced capabilities
    const response = await processUserQuery(userId, message);
    
    // ✅ Store bot response in chat history - handle different response formats
    if (typeof response === 'object') {
      if (response.response) {
        // Simple text response
        await saveChatMessage(userId, "bot", response.response);
      } else if (response.message) {
        // Doctor recommendation or other structured response
        await saveChatMessage(userId, "bot", response.message);
      }
    } else {
      await saveChatMessage(userId, "bot", response);
    }

    return res.status(200).json(response);
  } catch (error) {
    console.error("Error processing message:", error);
    const errorResponse = { 
      response: "I'm sorry, I encountered an error processing your request. Please try again." 
    };
    await saveChatMessage(userId, "bot", errorResponse.response);
    return res.status(500).json(errorResponse);
  }
});

module.exports = { chatbotResponse };
