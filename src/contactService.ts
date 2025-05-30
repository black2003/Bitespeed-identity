import { Database } from './database';
import { Contact, IdentifyRequest, IdentifyResponse } from './types';

export class ContactService {
  constructor(private db: Database) {}

  async identify(request: IdentifyRequest): Promise<IdentifyResponse> {
    const { email, phoneNumber } = request;
    
    // Find existing contacts with matching email or phone
    const existingContacts = await this.db.findContactsByEmailOrPhone(email, phoneNumber);
    
    if (existingContacts.length === 0) {
      // No existing contacts - create new primary contact
      const newContact = await this.db.createContact({
        email,
        phoneNumber,
        linkPrecedence: 'primary'
      });
      
      return {
        contact: {
          primaryContatctId: newContact.id,
          emails: newContact.email ? [newContact.email] : [],
          phoneNumbers: newContact.phoneNumber ? [newContact.phoneNumber] : [],
          secondaryContactIds: []
        }
      };
    }
    
    // Find primary contacts
    const primaryContacts = existingContacts.filter(c => c.linkPrecedence === 'primary');
    
    if (primaryContacts.length === 1) {
      // Single primary contact found
      const primary = primaryContacts[0];
      
      // Check if we need to create a secondary contact
      const exactMatch = existingContacts.find(c => 
        c.email === email && c.phoneNumber === phoneNumber
      );
      
      if (!exactMatch && this.hasNewInformation(existingContacts, email, phoneNumber)) {
        // Create secondary contact with new information
        await this.db.createContact({
          email,
          phoneNumber,
          linkedId: primary.id,
          linkPrecedence: 'secondary'
        });
      }
      
      return await this.buildResponse(primary.id);
    }
    
    if (primaryContacts.length > 1) {
      // Multiple primary contacts - need to merge them
      const oldestPrimary = primaryContacts.reduce((oldest, current) => 
        current.createdAt < oldest.createdAt ? current : oldest
      );
      
      // Convert other primaries to secondaries
      for (const primary of primaryContacts) {
        if (primary.id !== oldestPrimary.id) {
          await this.db.updateContact(primary.id, {
            linkedId: oldestPrimary.id,
            linkPrecedence: 'secondary'
          });
        }
      }
      
      // Check if we need to create a new secondary contact
      const allLinkedContacts = await this.db.getAllLinkedContacts(oldestPrimary.id);
      const exactMatch = allLinkedContacts.find(c => 
        c.email === email && c.phoneNumber === phoneNumber
      );
      
      if (!exactMatch && this.hasNewInformation(allLinkedContacts, email, phoneNumber)) {
        await this.db.createContact({
          email,
          phoneNumber,
          linkedId: oldestPrimary.id,
          linkPrecedence: 'secondary'
        });
      }
      
      return await this.buildResponse(oldestPrimary.id);
    }
    
    // Only secondary contacts found - find their primary
    const secondary = existingContacts[0];
    const primaryId = secondary.linkedId!;
    
    // Check if we need to create a new secondary contact
    const allLinkedContacts = await this.db.getAllLinkedContacts(primaryId);
    const exactMatch = allLinkedContacts.find(c => 
      c.email === email && c.phoneNumber === phoneNumber
    );
    
    if (!exactMatch && this.hasNewInformation(allLinkedContacts, email, phoneNumber)) {
      await this.db.createContact({
        email,
        phoneNumber,
        linkedId: primaryId,
        linkPrecedence: 'secondary'
      });
    }
    
    return await this.buildResponse(primaryId);
  }

  private hasNewInformation(existingContacts: Contact[], email?: string, phoneNumber?: string): boolean {
    const existingEmails = existingContacts.map(c => c.email).filter(Boolean) as string[];
    const existingPhones = existingContacts.map(c => c.phoneNumber).filter(Boolean) as string[];

    const hasNewEmail = !!email && !existingEmails.includes(email);
    const hasNewPhone = !!phoneNumber && !existingPhones.includes(phoneNumber);

    return hasNewEmail || hasNewPhone;
 }

  private async buildResponse(primaryId: number): Promise<IdentifyResponse> {
    const allContacts = await this.db.getAllLinkedContacts(primaryId);
    const primary = allContacts.find(c => c.linkPrecedence === 'primary')!;
    const secondaries = allContacts.filter(c => c.linkPrecedence === 'secondary');
    
    // Collect unique emails and phone numbers, with primary first
    const emails: string[] = [];
    const phoneNumbers: string[] = [];
    
    if (primary.email) emails.push(primary.email);
    if (primary.phoneNumber) phoneNumbers.push(primary.phoneNumber);
    
    for (const contact of secondaries) {
      if (contact.email && !emails.includes(contact.email)) {
        emails.push(contact.email);
      }
      if (contact.phoneNumber && !phoneNumbers.includes(contact.phoneNumber)) {
        phoneNumbers.push(contact.phoneNumber);
      }
    }
    
    return {
      contact: {
        primaryContatctId: primary.id,
        emails,
        phoneNumbers,
        secondaryContactIds: secondaries.map(c => c.id)
      }
    };
  }
}