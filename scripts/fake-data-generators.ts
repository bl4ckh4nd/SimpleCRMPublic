// fake-data-generators.ts
// Utility functions for generating realistic German-appropriate fake data

export interface FakeCustomer {
    name: string;
    firstName: string;
    company?: string;
    email: string;
    phone: string;
    mobile?: string;
    street: string;
    zipCode: string;
    city: string;
    country: string;
    status: string;
    notes?: string;
    affiliateLink?: string;
}

export interface FakeProduct {
    name: string;
    sku: string;
    description: string;
    price: number;
    isActive: boolean;
}

// German company names and suffixes
const companyNames = [
    'Müller', 'Schmidt', 'Schneider', 'Fischer', 'Weber', 'Meyer', 'Wagner', 'Becker', 'Schulz', 'Hoffmann',
    'Schäfer', 'Koch', 'Bauer', 'Richter', 'Klein', 'Wolf', 'Schröder', 'Neumann', 'Schwarz', 'Zimmermann',
    'Braun', 'Krüger', 'Hofmann', 'Hartmann', 'Lange', 'Schmitt', 'Werner', 'Schmitz', 'Krause', 'Meier'
];

const companySuffixes = ['GmbH', 'AG', 'KG', 'GmbH & Co. KG', 'UG (haftungsbeschränkt)', 'e.K.', 'OHG'];

const companyTypes = [
    'Handels', 'Service', 'Beratungs', 'Software', 'Bau', 'Transport', 'Logistik', 'Marketing', 'Design', 'Engineering',
    'Consulting', 'Solutions', 'Systems', 'Technology', 'Digital', 'Innovation', 'Management', 'Vertriebs'
];

// German first names
const firstNames = [
    'Alexander', 'Andreas', 'Anna', 'Bernd', 'Birgit', 'Christian', 'Christine', 'Daniel', 'Diana', 'Frank',
    'Gabriele', 'Hans', 'Heike', 'Heinrich', 'Ingrid', 'Jürgen', 'Karin', 'Klaus', 'Maria', 'Martin',
    'Matthias', 'Michael', 'Monika', 'Nicole', 'Oliver', 'Petra', 'Ralf', 'Sabine', 'Stefan', 'Thomas',
    'Tobias', 'Ursula', 'Uwe', 'Werner', 'Wolfgang', 'Andrea', 'Barbara', 'Claudia', 'Daniela', 'Elisabeth',
    'Eva', 'Gisela', 'Helga', 'Hildegard', 'Julia', 'Katrin', 'Manuela', 'Marion', 'Martina', 'Renate'
];

// German last names
const lastNames = [
    'Müller', 'Schmidt', 'Schneider', 'Fischer', 'Weber', 'Meyer', 'Wagner', 'Becker', 'Schulz', 'Hoffmann',
    'Schäfer', 'Koch', 'Bauer', 'Richter', 'Klein', 'Wolf', 'Schröder', 'Neumann', 'Schwarz', 'Zimmermann',
    'Braun', 'Krüger', 'Hofmann', 'Hartmann', 'Lange', 'Schmitt', 'Werner', 'Schmitz', 'Krause', 'Meier',
    'Lehmann', 'Huber', 'Mayer', 'Herrmann', 'König', 'Walter', 'Fuchs', 'Kaiser', 'Lang', 'Peters',
    'Stein', 'Jung', 'Möller', 'Berger', 'Weiß', 'Günther', 'Frank', 'Berger', 'Winkler', 'Roth'
];

// German cities with their postal codes
const germanCities = [
    { name: 'Berlin', zipCodes: ['10115', '10117', '10119', '10178', '10179', '10243', '10245', '10247'] },
    { name: 'Hamburg', zipCodes: ['20095', '20099', '20144', '20146', '20148', '20149', '20251', '20253'] },
    { name: 'München', zipCodes: ['80331', '80333', '80335', '80336', '80337', '80469', '80538', '80539'] },
    { name: 'Köln', zipCodes: ['50667', '50668', '50670', '50672', '50674', '50676', '50677', '50678'] },
    { name: 'Frankfurt', zipCodes: ['60308', '60311', '60313', '60314', '60316', '60318', '60320', '60322'] },
    { name: 'Stuttgart', zipCodes: ['70173', '70174', '70176', '70178', '70180', '70182', '70184', '70186'] },
    { name: 'Düsseldorf', zipCodes: ['40210', '40211', '40212', '40213', '40215', '40217', '40219', '40221'] },
    { name: 'Dortmund', zipCodes: ['44135', '44137', '44139', '44141', '44143', '44145', '44147', '44149'] },
    { name: 'Essen', zipCodes: ['45127', '45128', '45130', '45131', '45133', '45134', '45136', '45138'] },
    { name: 'Leipzig', zipCodes: ['04109', '04155', '04177', '04179', '04229', '04277', '04289', '04299'] },
    { name: 'Bremen', zipCodes: ['28195', '28199', '28203', '28205', '28207', '28209', '28211', '28213'] },
    { name: 'Dresden', zipCodes: ['01067', '01069', '01097', '01099', '01127', '01129', '01139', '01187'] }
];

// German street names
const streetNames = [
    'Hauptstraße', 'Bahnhofstraße', 'Dorfstraße', 'Schulstraße', 'Gartenstraße', 'Kirchstraße', 'Marktplatz',
    'Lindenstraße', 'Bergstraße', 'Mühlstraße', 'Poststraße', 'Ringstraße', 'Waldstraße', 'Am Park',
    'Mozartstraße', 'Goethestraße', 'Schillerstraße', 'Beethovenstraße', 'Bachstraße', 'Kantstraße',
    'Friedrichstraße', 'Wilhelmstraße', 'Kaiserstraße', 'Königstraße', 'Bismarckstraße', 'Am Markt'
];

// Product categories and names
const productCategories = [
    'Computer & Zubehör', 'Büroausstattung', 'Software', 'Elektronik', 'Möbel', 'Werkzeuge',
    'Fahrzeuge', 'Maschinen', 'Materialien', 'Dienstleistungen', 'Beratung', 'Schulungen'
];

const productNames = [
    // Computer & Electronics
    'Desktop Computer', 'Laptop', 'Monitor', 'Tastatur', 'Maus', 'Drucker', 'Scanner', 'Tablet',
    'Smartphone', 'Kamera', 'Headset', 'Lautsprecher', 'Router', 'Switch', 'Server',
    
    // Office Equipment
    'Bürostuhl', 'Schreibtisch', 'Aktenschrank', 'Whiteboard', 'Flipchart', 'Laminator',
    'Aktenvernichter', 'Kopierpapier', 'Ordner', 'Locher', 'Tacker', 'Textmarker',
    
    // Software
    'Office Suite', 'Antivirus Software', 'Buchhaltung Software', 'CRM System', 'ERP System',
    'CAD Software', 'Design Software', 'Backup Software', 'Projektmanagement Tool',
    
    // Tools & Equipment
    'Bohrmaschine', 'Säge', 'Hammer', 'Schraubendreher Set', 'Wasserwaage', 'Messgerät',
    'Schweißgerät', 'Kompressor', 'Generator', 'Leiter', 'Werkzeugkoffer'
];

const productDescriptions = [
    'Hochwertige Qualität für professionelle Anwendungen',
    'Robuste Konstruktion für den täglichen Einsatz',
    'Innovative Technologie für maximale Effizienz',
    'Ergonomisches Design für optimalen Komfort',
    'Energiesparend und umweltfreundlich',
    'Einfache Installation und Bedienung',
    'Langlebig und wartungsarm',
    'Optimiert für den deutschen Markt',
    'Entspricht allen EU-Standards',
    'Inklusive umfassender Garantie'
];

// Utility functions
export function randomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function randomChoice<T>(array: T[]): T {
    return array[Math.floor(Math.random() * array.length)];
}

export function randomBoolean(probability: number = 0.5): boolean {
    return Math.random() < probability;
}

export function generateGermanPhone(): string {
    const areaCode = randomChoice(['030', '040', '089', '0221', '069', '0711', '0211', '0231']);
    const number = randomInt(1000000, 9999999).toString();
    return `${areaCode} ${number}`;
}

export function generateMobile(): string {
    const prefixes = ['0151', '0152', '0157', '0159', '0160', '0170', '0171', '0172', '0173', '0174', '0175'];
    const prefix = randomChoice(prefixes);
    const number = randomInt(1000000, 9999999).toString();
    return `${prefix} ${number}`;
}

export function generateEmail(firstName: string, lastName: string, company?: string): string {
    const domains = ['gmail.com', 'web.de', 't-online.de', 'gmx.de', 'yahoo.de', 'outlook.de'];
    
    if (company && randomBoolean(0.6)) {
        const cleanCompany = company.toLowerCase()
            .replace(/[^a-z0-9]/g, '')
            .substring(0, 15);
        return `${firstName.toLowerCase()}.${lastName.toLowerCase()}@${cleanCompany}.de`;
    }
    
    const domain = randomChoice(domains);
    const separator = randomChoice(['.', '_', '']);
    return `${firstName.toLowerCase()}${separator}${lastName.toLowerCase()}@${domain}`;
}

export function generateCompanyName(): string {
    if (randomBoolean(0.3)) {
        // Family business style
        const name1 = randomChoice(companyNames);
        const name2 = randomChoice(companyNames);
        const suffix = randomChoice(companySuffixes);
        return `${name1} & ${name2} ${suffix}`;
    } else if (randomBoolean(0.5)) {
        // Type + Name style
        const type = randomChoice(companyTypes);
        const name = randomChoice(companyNames);
        const suffix = randomChoice(companySuffixes);
        return `${type} ${name} ${suffix}`;
    } else {
        // Simple name + suffix
        const name = randomChoice(companyNames);
        const suffix = randomChoice(companySuffixes);
        return `${name} ${suffix}`;
    }
}

export function generateAddress(): { street: string; zipCode: string; city: string } {
    const cityData = randomChoice(germanCities);
    const streetName = randomChoice(streetNames);
    const houseNumber = randomInt(1, 150);
    
    return {
        street: `${streetName} ${houseNumber}`,
        zipCode: randomChoice(cityData.zipCodes),
        city: cityData.name
    };
}

export function generateSKU(index: number): string {
    const prefix = randomChoice(['PRD', 'ART', 'ITM', 'SKU']);
    const category = randomChoice(['A', 'B', 'C', 'D', 'E']);
    const number = (index + 1000).toString().padStart(6, '0');
    return `${prefix}-${category}${number}`;
}

export function generateProductName(): string {
    const baseName = randomChoice(productNames);
    const adjectives = ['Professional', 'Premium', 'Standard', 'Basic', 'Advanced', 'Compact', 'Deluxe'];
    
    if (randomBoolean(0.4)) {
        const adjective = randomChoice(adjectives);
        return `${adjective} ${baseName}`;
    }
    
    return baseName;
}

export function generateProductDescription(): string {
    const baseDesc = randomChoice(productDescriptions);
    const features = [
        'mit 2 Jahren Garantie',
        'inkl. kostenlosem Support',
        'Made in Germany',
        'CE-zertifiziert',
        'in verschiedenen Ausführungen erhältlich',
        'sofort lieferbar',
        'für den professionellen Einsatz'
    ];
    
    if (randomBoolean(0.6)) {
        const feature = randomChoice(features);
        return `${baseDesc} - ${feature}.`;
    }
    
    return `${baseDesc}.`;
}

export function generatePrice(): number {
    const priceRanges = [
        { min: 5, max: 50, weight: 0.3 },      // Small items
        { min: 50, max: 200, weight: 0.3 },    // Medium items
        { min: 200, max: 1000, weight: 0.25 }, // Large items
        { min: 1000, max: 5000, weight: 0.15 } // Expensive items
    ];
    
    const random = Math.random();
    let cumulative = 0;
    
    for (const range of priceRanges) {
        cumulative += range.weight;
        if (random <= cumulative) {
            const price = randomInt(range.min * 100, range.max * 100) / 100;
            return Math.round(price * 100) / 100; // Round to 2 decimal places
        }
    }
    
    return 99.99; // Fallback
}

export function generateCustomer(index: number): FakeCustomer {
    const firstName = randomChoice(firstNames);
    const lastName = randomChoice(lastNames);
    const isCompany = randomBoolean(0.4);
    const company = isCompany ? generateCompanyName() : undefined;
    const address = generateAddress();
    
    return {
        name: lastName,
        firstName: firstName,
        company: company,
        email: generateEmail(firstName, lastName, company),
        phone: generateGermanPhone(),
        mobile: randomBoolean(0.7) ? generateMobile() : undefined,
        street: address.street,
        zipCode: address.zipCode,
        city: address.city,
        country: 'Deutschland',
        status: randomChoice(['Active', 'Inactive', 'Prospect']),
        notes: randomBoolean(0.3) ? `Automatisch generierter Testkunde #${index + 1}` : undefined,
        affiliateLink: randomBoolean(0.1) ? `https://partner.example.com/ref/${index + 1}` : undefined
    };
}

export function generateProduct(index: number): FakeProduct {
    return {
        name: generateProductName(),
        sku: generateSKU(index),
        description: generateProductDescription(),
        price: generatePrice(),
        isActive: randomBoolean(0.9) // 90% active products
    };
}