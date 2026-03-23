import { Booking } from "@prisma/client";

export interface MeetingDetails {
  meetingLink: string | null;
  meetingInstructions: string | null;
  providerMetadata?: string | null;
}

export interface MeetingProvider {
  generateMeeting(
    booking: Booking, 
    consultantProvidedLink?: string | null, 
    consultantProvidedInstructions?: string | null
  ): Promise<MeetingDetails>;
}

/**
 * The Manual Provider simply echoes back the link and instructions 
 * provided explicitly by the consultant during the confirmation phase.
 */
export class ManualMeetingProvider implements MeetingProvider {
  async generateMeeting(
    booking: Booking, 
    consultantProvidedLink?: string | null, 
    consultantProvidedInstructions?: string | null
  ): Promise<MeetingDetails> {
    
    return {
      meetingLink: consultantProvidedLink || null,
      meetingInstructions: consultantProvidedInstructions || null,
      providerMetadata: JSON.stringify({ 
        strategy: "MANUAL", 
        generatedAt: new Date().toISOString() 
      })
    };
  }
}

/**
 * Factory class to abstract away the specific provider logic from the controllers.
 * Currently supports 'MANUAL'. Google and Zoom stubs remain architectural markers.
 */
export class MeetingProviderService {
  static getProvider(providerName?: string | null): MeetingProvider {
    switch (providerName?.toUpperCase()) {
      case "MANUAL":
        return new ManualMeetingProvider();
      case "GOOGLE_CALENDAR":
        throw new Error("Google Calendar integration is coming soon.");
      case "ZOOM":
        throw new Error("Zoom integration is coming soon.");
      default:
        // Fallback to manual if unknown or null
        return new ManualMeetingProvider();
    }
  }
}
