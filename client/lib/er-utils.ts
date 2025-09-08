// Types for ER diagram structure
export interface EntityAttribute {
  name: string;
  type: string;
  isPrimaryKey: boolean;
  isForeignKey: boolean;
  isRequired: boolean;
  referencedEntity?: string;
}

export interface Entity {
  name: string;
  displayName: string;
  attributes: EntityAttribute[];
}

export interface Relationship {
  from: string;
  to: string;
  type: 'one-to-one' | 'one-to-many' | 'many-to-one' | 'many-to-many';
  description: string;
  cardinality: string;
}

export interface ERDiagram {
  entities: Entity[];
  relationships: Relationship[];
}

// Utility functions for data type detection
export const detectDataType = (attributeName: string, description?: string): string => {
  const name = attributeName.toLowerCase();
  const desc = description?.toLowerCase() || '';
  
  // Primary key detection
  if (name === 'id' || name.endsWith('_id') || name.includes('primary')) {
    return 'int';
  }
  
  // Date/time types
  if (name.includes('date') || name.includes('time') || name.includes('created') || 
      name.includes('updated') || name.includes('deleted') || name.includes('born') ||
      desc.includes('date') || desc.includes('time')) {
    if (name.includes('time') || desc.includes('timestamp')) return 'timestamp';
    return 'date';
  }
  
  // Numeric types
  if (name.includes('price') || name.includes('cost') || name.includes('amount') || 
      name.includes('salary') || name.includes('budget') || name.includes('balance') ||
      desc.includes('money') || desc.includes('currency') || desc.includes('decimal')) {
    return 'decimal';
  }
  
  if (name.includes('count') || name.includes('quantity') || name.includes('stock') || 
      name.includes('rating') || name.includes('score') || name.includes('age') ||
      name.includes('year') || name.includes('number') || desc.includes('integer')) {
    return 'int';
  }
  
  // Boolean types
  if (name.includes('is_') || name.includes('has_') || name.includes('can_') || 
      name.includes('active') || name.includes('enabled') || name.includes('deleted') ||
      desc.includes('boolean') || desc.includes('true') || desc.includes('false')) {
    return 'boolean';
  }
  
  // Text types
  if (name.includes('description') || name.includes('content') || name.includes('text') ||
      name.includes('comment') || name.includes('note') || name.includes('bio') ||
      desc.includes('long') || desc.includes('paragraph')) {
    return 'text';
  }
  
  if (name.includes('email')) return 'email';
  if (name.includes('phone') || name.includes('mobile')) return 'phone';
  if (name.includes('url') || name.includes('website') || name.includes('link')) return 'url';
  
  // Default to string
  return 'string';
};

// Parse table definitions from text
export const parseTableDefinition = (text: string): Entity[] => {
  const entities: Entity[] = [];
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  
  let currentEntity: Entity | null = null;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].toLowerCase();
    
    // Check for table definitions
    const tablePatterns = [
      /(\w+)\s+table/,
      /table\s+(\w+)/,
      /entity\s+(\w+)/,
      /(\w+)\s+entity/,
      /(\w+):/
    ];
    
    let entityName = '';
    for (const pattern of tablePatterns) {
      const match = line.match(pattern);
      if (match) {
        entityName = match[1];
        break;
      }
    }
    
    if (entityName) {
      currentEntity = {
        name: entityName.toLowerCase(),
        displayName: entityName.toUpperCase().replace(/_/g, '-'),
        attributes: []
      };
      
      // Check for attributes in the same line (parentheses format)
      const attributeMatch = lines[i].match(/\((.*)\)/);
      if (attributeMatch) {
        const attributes = attributeMatch[1].split(',').map(attr => attr.trim());
        currentEntity.attributes = parseAttributes(attributes);
      }
      
      entities.push(currentEntity);
      continue;
    }
    
    // Parse attributes on subsequent lines
    if (currentEntity && (line.startsWith('-') || line.startsWith('•') || line.startsWith('*'))) {
      const attributeText = line.replace(/^[-•*]\s*/, '');
      if (attributeText.includes('(') && attributeText.includes(')')) {
        const match = attributeText.match(/(.*?)\s*\((.*?)\)/);
        if (match) {
          const entityName = match[1].trim();
          const attributes = match[2].split(',').map(attr => attr.trim());
          
          // Find or create entity
          let entity = entities.find(e => e.name === entityName.toLowerCase());
          if (!entity) {
            entity = {
              name: entityName.toLowerCase(),
              displayName: entityName.toUpperCase().replace(/_/g, '-'),
              attributes: parseAttributes(attributes)
            };
            entities.push(entity);
          } else {
            entity.attributes = parseAttributes(attributes);
          }
        }
      } else {
        // Single attribute
        const attr = parseAttribute(attributeText);
        if (attr) {
          currentEntity.attributes.push(attr);
        }
      }
    }
  }
  
  return entities;
};

// Parse individual attributes
export const parseAttributes = (attributeStrings: string[]): EntityAttribute[] => {
  return attributeStrings.map(parseAttribute).filter(attr => attr !== null) as EntityAttribute[];
};

export const parseAttribute = (attributeString: string): EntityAttribute | null => {
  if (!attributeString.trim()) return null;
  
  const cleaned = attributeString.trim().replace(/[,;]$/, '');
  const isPrimaryKey = cleaned === 'id' || cleaned.includes('primary') || cleaned.toLowerCase().includes('pk');
  const isForeignKey = cleaned.includes('_id') && cleaned !== 'id';
  const isRequired = !cleaned.includes('optional') && !cleaned.includes('nullable');
  
  let referencedEntity: string | undefined;
  if (isForeignKey) {
    referencedEntity = cleaned.replace('_id', '').replace(/^fk_/, '');
  }
  
  return {
    name: cleaned,
    type: detectDataType(cleaned),
    isPrimaryKey,
    isForeignKey,
    isRequired,
    referencedEntity
  };
};

// Parse relationships from text
export const parseRelationships = (text: string, entities: Entity[]): Relationship[] => {
  const relationships: Relationship[] = [];
  const lines = text.split('\n').map(line => line.trim().toLowerCase());
  const entityNames = entities.map(e => e.name);
  
  for (const line of lines) {
    if (!line.includes('relationship') && !line.includes('have') && !line.includes('belong') && 
        !line.includes('can') && !line.includes('many') && !line.includes('one')) {
      continue;
    }
    
    // Find entities mentioned in the line
    const mentionedEntities = entityNames.filter(name => line.includes(name));
    
    if (mentionedEntities.length >= 2) {
      const from = mentionedEntities[0];
      const to = mentionedEntities[1];
      
      let type: Relationship['type'] = 'one-to-many';
      let cardinality = '||--o{';
      
      if (line.includes('many-to-many') || line.includes('many to many')) {
        type = 'many-to-many';
        cardinality = '}|--||';
      } else if (line.includes('one-to-one') || line.includes('one to one')) {
        type = 'one-to-one';
        cardinality = '||--||';
      } else if (line.includes('many-to-one') || (line.includes('belong') && line.includes(to))) {
        type = 'many-to-one';
        cardinality = '}o--||';
      }
      
      relationships.push({
        from,
        to,
        type,
        description: extractRelationshipDescription(line, from, to),
        cardinality
      });
    }
  }
  
  // Infer relationships from foreign keys if none explicitly defined
  if (relationships.length === 0) {
    for (const entity of entities) {
      for (const attr of entity.attributes) {
        if (attr.isForeignKey && attr.referencedEntity) {
          const referencedEntity = entities.find(e => e.name === attr.referencedEntity);
          if (referencedEntity) {
            relationships.push({
              from: attr.referencedEntity,
              to: entity.name,
              type: 'one-to-many',
              description: 'has',
              cardinality: '||--o{'
            });
          }
        }
      }
    }
  }
  
  return relationships;
};

// Extract relationship description
const extractRelationshipDescription = (line: string, from: string, to: string): string => {
  if (line.includes('have') || line.includes('has')) return 'has';
  if (line.includes('belong') || line.includes('belongs')) return 'belongs to';
  if (line.includes('own') || line.includes('owns')) return 'owns';
  if (line.includes('contain') || line.includes('contains')) return 'contains';
  if (line.includes('manage') || line.includes('manages')) return 'manages';
  if (line.includes('assign') || line.includes('assigned')) return 'assigned to';
  return 'related to';
};

// Generate Mermaid ER diagram
export const generateMermaidER = (diagram: ERDiagram): string => {
  let mermaid = 'erDiagram\n';
  
  // Add entities with attributes
  for (const entity of diagram.entities) {
    mermaid += `    ${entity.displayName} {\n`;
    
    for (const attr of entity.attributes) {
      const keyType = attr.isPrimaryKey ? 'PK' : attr.isForeignKey ? 'FK' : '';
      mermaid += `        ${attr.type} ${attr.name.replace(/ /g, '_')} ${keyType}\n`;
    }
    
    mermaid += '    }\n\n';
  }
  
  // Add relationships
  for (const rel of diagram.relationships) {
    const fromEntity = diagram.entities.find(e => e.name === rel.from)?.displayName || rel.from.toUpperCase();
    const toEntity = diagram.entities.find(e => e.name === rel.to)?.displayName || rel.to.toUpperCase();
    
    mermaid += `    ${fromEntity} ${rel.cardinality} ${toEntity} : "${rel.description}"\n`;
  }
  
  return mermaid;
};

// Main parsing function
export const parseTextToERDiagram = (text: string): ERDiagram => {
  const entities = parseTableDefinition(text);
  const relationships = parseRelationships(text, entities);
  
  return {
    entities,
    relationships
  };
};

// Validate ER diagram
export const validateERDiagram = (diagram: ERDiagram): string[] => {
  const errors: string[] = [];
  
  if (diagram.entities.length === 0) {
    errors.push('No entities found. Please describe your database tables.');
  }
  
  for (const entity of diagram.entities) {
    if (entity.attributes.length === 0) {
      errors.push(`Entity '${entity.name}' has no attributes defined.`);
    }
    
    const hasPrimaryKey = entity.attributes.some(attr => attr.isPrimaryKey);
    if (!hasPrimaryKey) {
      errors.push(`Entity '${entity.name}' should have a primary key.`);
    }
  }
  
  // Check for foreign key references
  for (const entity of diagram.entities) {
    for (const attr of entity.attributes) {
      if (attr.isForeignKey && attr.referencedEntity) {
        const referencedEntity = diagram.entities.find(e => e.name === attr.referencedEntity);
        if (!referencedEntity) {
          errors.push(`Foreign key '${attr.name}' in '${entity.name}' references unknown entity '${attr.referencedEntity}'.`);
        }
      }
    }
  }
  
  return errors;
};

// Generate example templates
export const getExampleTemplates = () => {
  return [
    {
      title: "E-commerce Database",
      description: "Online store with customers, orders, and products",
      text: `Create an e-commerce system with:
- Users table (id, name, email, password, phone, address, created_at, is_active)
- Products table (id, name, description, price, stock_quantity, category_id, brand, created_at)
- Categories table (id, name, description, parent_id)
- Orders table (id, user_id, total_amount, order_date, status, shipping_address)
- Order_Items table (id, order_id, product_id, quantity, unit_price, subtotal)
- Reviews table (id, user_id, product_id, rating, comment, created_at)
- Shopping_Cart table (id, user_id, product_id, quantity, added_at)

Relationships:
- Users have many Orders (one-to-many)
- Orders have many Order_Items (one-to-many)
- Products have many Order_Items (one-to-many)
- Products belong to Categories (many-to-one)
- Users can write Reviews for Products (many-to-many)
- Users have Shopping_Cart items (one-to-many)`
    },
    {
      title: "Library Management System",
      description: "Library system with books, members, and loans",
      text: `Design a library management database with:
- Members table (id, first_name, last_name, email, phone, address, membership_date, membership_type)
- Books table (id, title, isbn, publication_year, pages, language, copies_available, location)
- Authors table (id, first_name, last_name, biography, birth_date, nationality)
- Publishers table (id, name, address, contact_email, phone)
- Book_Authors table (id, book_id, author_id)
- Loans table (id, member_id, book_id, loan_date, due_date, return_date, fine_amount, status)
- Reservations table (id, member_id, book_id, reservation_date, status)

Relationships:
- Members can have multiple Loans (one-to-many)
- Books can be loaned multiple times (one-to-many)
- Books have Authors (many-to-many through Book_Authors)
- Books have Publishers (many-to-one)
- Members can make Reservations (one-to-many)`
    },
    {
      title: "Hospital Management System",
      description: "Healthcare system with patients, doctors, and appointments",
      text: `Create a hospital database with:
- Patients table (id, first_name, last_name, date_of_birth, gender, phone, email, address, blood_type, emergency_contact)
- Doctors table (id, first_name, last_name, specialization, phone, email, license_number, hire_date)
- Departments table (id, name, location, head_doctor_id, budget)
- Appointments table (id, patient_id, doctor_id, appointment_date, appointment_time, status, notes)
- Medical_Records table (id, patient_id, doctor_id, visit_date, diagnosis, prescription, notes)
- Nurses table (id, first_name, last_name, department_id, shift, phone, hire_date)
- Rooms table (id, room_number, room_type, department_id, is_occupied, daily_rate)

Relationships:
- Patients have many Appointments (one-to-many)
- Doctors have many Appointments (one-to-many)  
- Doctors belong to Departments (many-to-one)
- Patients have Medical_Records (one-to-many)
- Doctors create Medical_Records (one-to-many)
- Departments have head Doctors (one-to-one)`
    }
  ];
};

// Format Mermaid code for better readability
export const formatMermaidCode = (code: string): string => {
  return code
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .join('\n');
};

// Export utility for downloading Mermaid file
export const downloadMermaidFile = (code: string, filename: string = 'er-diagram') => {
  const blob = new Blob([code], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}.mmd`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

// Copy to clipboard utility
export const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    // Fallback for older browsers
    const textArea = document.createElement('textarea');
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);
      return successful;
    } catch (err) {
      document.body.removeChild(textArea);
      return false;
    }
  }
};
