import sql from 'mssql'; // Import sql for types
import { getMssqlSettingsWithKeytar, executeTransactionalQuery } from './mssql-keytar-service';
import { getCustomerById } from './sqlite-service'; 
import { MssqlSettings } from './types';

// Define the structure for products as expected in orderInput, locally to avoid pathing issues
interface OrderInputProduct {
    kArtikel: number;
    cName: string; 
    cArtNr: string; 
    nAnzahl: number;
    fPreis: number; 
}

interface SimpleCrmOrderInput {
    // kKunde: number; // This will come from crmCustomer.jtl_kKunde
    // cAnrede: string;
    // cFirma: string;
    // cName: string; // Combined from firstName/lastName or company contact
    // cStrasse: string;
    // cHausnummer: string;
    // cPLZ: string;
    // cOrt: string;
    // cLandISO: string;
    // cTel?: string;
    // cMobil?: string;
    // cEmail?: string;
    // cZusatz?: string;
    simpleCrmCustomerId: number; // ID from SimpleCRM's customers table to fetch the customer

    kFirma: number;
    kWarenlager: number;
    kZahlungsart: number;
    kVersandart: number;
    products: OrderInputProduct[]; // Use the locally defined interface for products
}

interface JtlOrderServiceResponse {
    success: boolean;
    jtlOrderId?: number;
    jtlOrderNumber?: string;
    error?: string;
}

export async function createJtlOrder(orderInput: SimpleCrmOrderInput): Promise<JtlOrderServiceResponse> {
    try {
        const mssqlSettings = await getMssqlSettingsWithKeytar();

        if (!mssqlSettings ||
            mssqlSettings.kBenutzer === undefined ||
            mssqlSettings.kShop === undefined ||
            mssqlSettings.kPlattform === undefined ||
            mssqlSettings.kSprache === undefined) {
            return { success: false, error: 'JTL Wawi connection or required base settings (kBenutzer, kShop, kPlattform, kSprache) not configured.' };
        }
        // Provide defaults for optional settings if not present
        const kBenutzer = mssqlSettings.kBenutzer;
        const kShop = mssqlSettings.kShop;
        const kPlattform = mssqlSettings.kPlattform;
        const kSprache = mssqlSettings.kSprache;
        const cWaehrung = mssqlSettings.cWaehrung || 'EUR';
        const fWaehrungFaktor = mssqlSettings.fWaehrungFaktor || 1.0;


        const crmCustomer = await getCustomerById(orderInput.simpleCrmCustomerId);
        if (!crmCustomer || crmCustomer.jtl_kKunde === null || crmCustomer.jtl_kKunde === undefined) {
            return { success: false, error: `Customer with SimpleCRM ID ${orderInput.simpleCrmCustomerId} not found or not synced with JTL (missing jtl_kKunde).` };
        }
        const jtlKundeId = crmCustomer.jtl_kKunde;

        if (!orderInput.products || orderInput.products.length === 0) {
            return { success: false, error: 'No products provided for the order.' };
        }

        let artikelListeSql = 'DECLARE @App_ArtikelListe TABLE (kArtikel INT, fAnzahl DECIMAL(25,13), fPreisNetto DECIMAL(25,13), Reihenfolge INT)\n';
        let hasValidProducts = false;
        for (let i = 0; i < orderInput.products.length; i++) {
            const p = orderInput.products[i];
            if (p.kArtikel > 0 && p.fPreis !== null && p.fPreis !== undefined) {
                // Ensure values are numbers to prevent SQL issues in string concatenation for @App_ArtikelListe
                const kArtikelVal = Number(p.kArtikel);
                const fAnzahlVal = Number(p.nAnzahl);
                const fPreisVal = Number(p.fPreis);
                const reihenfolgeVal = Number(i + 1);

                artikelListeSql += `INSERT INTO @App_ArtikelListe (kArtikel, fAnzahl, fPreisNetto, Reihenfolge) VALUES (${kArtikelVal}, ${fAnzahlVal}, ${fPreisVal}, ${reihenfolgeVal})\n`;
                hasValidProducts = true;
            } else {
                console.warn(`Product ${p.cName} (kArtikel: ${p.kArtikel}) is missing kArtikel or price and will be skipped.`);
            }
        }
        
        if (!hasValidProducts) {
            return { success: false, error: 'No valid products with JTL kArtikel and price found to create an order.' };
        }

        const params: { name: string, type: any, value: any }[] = [
            { name: 'App_kKunde', type: sql.Int, value: jtlKundeId },
            { name: 'App_kBenutzer', type: sql.Int, value: kBenutzer },
            { name: 'App_kShop', type: sql.Int, value: kShop },
            { name: 'App_kPlattform', type: sql.Int, value: kPlattform },
            { name: 'App_kSprache', type: sql.Int, value: kSprache },
            { name: 'App_kFirma', type: sql.Int, value: orderInput.kFirma },
            { name: 'App_kWarenlager', type: sql.Int, value: orderInput.kWarenlager },
            { name: 'App_kZahlungsart', type: sql.Int, value: orderInput.kZahlungsart },
            { name: 'App_kVersandart', type: sql.Int, value: orderInput.kVersandart },
            { name: 'App_cWaehrung', type: sql.NVarChar(3), value: 'EUR' },
            { name: 'App_fWaehrungFaktor', type: sql.Decimal(25, 13), value: 1.0 },

                    // Parameters for newly added NOT NULL columns (mostly defaults, already handled in SQL)
            { name: 'App_cVersandlandWaehrung', type: sql.Char(3), value: 'EUR' },
            { name: 'App_fVersandlandWaehrungFaktor', type: sql.Decimal(25, 13), value: 1.0 },
            // Rechnungsadresse from crmCustomer (passed from frontend as part of orderInput.customerDetails or similar)
            // For now, using crmCustomer directly fetched via simpleCrmCustomerId
            { name: 'RA_cFirma', type: sql.NVarChar(256), value: crmCustomer.company_name || (crmCustomer.is_company ? crmCustomer.company : null) },
            { name: 'RA_cVorname', type: sql.NVarChar(510), value: crmCustomer.is_company ? (crmCustomer.contact_person_name || '').split(' ')[0] : (crmCustomer.firstName || '').split(' ')[0] }, // Basic split
            { name: 'RA_cName', type: sql.NVarChar(510), value: crmCustomer.is_company ? (crmCustomer.contact_person_name || '').substring((crmCustomer.contact_person_name || '').indexOf(' ') + 1).trim() : (crmCustomer.name || '').substring((crmCustomer.name || '').indexOf(' ') + 1).trim()}, // Basic split
            { name: 'RA_cStrasse', type: sql.NVarChar(510), value: crmCustomer.street }, // Assuming street includes number for now
            { name: 'RA_cPLZ', type: sql.NVarChar(48), value: crmCustomer.zip },
            { name: 'RA_cOrt', type: sql.NVarChar(510), value: crmCustomer.city },
            { name: 'RA_cLand', type: sql.NVarChar(510), value: crmCustomer.country || 'Deutschland' },
            { name: 'RA_cISO', type: sql.NVarChar(10), value: (crmCustomer.country_iso || 'DE').toUpperCase() },
            { name: 'RA_cTel', type: sql.NVarChar(510), value: crmCustomer.phone || null },
            { name: 'RA_cMail', type: sql.NVarChar(510), value: crmCustomer.email || null },
            { name: 'RA_cZusatz', type: sql.NVarChar(510), value: crmCustomer.notes || null }, // Map notes to cZusatz for billing

            // Lieferadresse (assuming same as billing for now, can be different if provided)
            // These should ideally come from orderInput if different shipping address is supported
            { name: 'LA_cFirma', type: sql.NVarChar(256), value: crmCustomer.company_name || (crmCustomer.is_company ? crmCustomer.company : null) },
            { name: 'LA_cVorname', type: sql.NVarChar(510), value: crmCustomer.is_company ? (crmCustomer.contact_person_name || '').split(' ')[0] : (crmCustomer.firstName || '').split(' ')[0] },
            { name: 'LA_cName', type: sql.NVarChar(510), value: crmCustomer.is_company ? (crmCustomer.contact_person_name || '').substring((crmCustomer.contact_person_name || '').indexOf(' ') + 1).trim() : (crmCustomer.name || '').substring((crmCustomer.name || '').indexOf(' ') + 1).trim()},
            { name: 'LA_cStrasse', type: sql.NVarChar(510), value: crmCustomer.street },
            { name: 'LA_cPLZ', type: sql.NVarChar(48), value: crmCustomer.zip },
            { name: 'LA_cOrt', type: sql.NVarChar(510), value: crmCustomer.city },
            { name: 'LA_cLand', type: sql.NVarChar(510), value: crmCustomer.country || 'Deutschland' },
            { name: 'LA_cISO', type: sql.NVarChar(10), value: (crmCustomer.country_iso || 'DE').toUpperCase() },
            { name: 'LA_cTel', type: sql.NVarChar(510), value: crmCustomer.phone || null },
            { name: 'LA_cMail', type: sql.NVarChar(510), value: crmCustomer.email || null },
        ];
        
        // Add cAnrede and cTitel if available from crmCustomer.salutation
        // Example: "Herr Dr." -> cAnrede="Herr", cTitel="Dr."
        // This is a simplified example; more robust parsing might be needed.
        const salutation = crmCustomer.salutation || "";
        let raAnrede: string | null = null;
        let raTitel: string | null = null;
        if (salutation.includes("Herr")) raAnrede = "Herr";
        if (salutation.includes("Frau")) raAnrede = "Frau";
        // Add more sophisticated title extraction if needed
        if (salutation.toLowerCase().includes("dr.")) raTitel = "Dr.";
        if (salutation.toLowerCase().includes("prof.")) raTitel = "Prof.";


        params.push({ name: 'RA_cAnrede', type: sql.NVarChar(255), value: raAnrede });
        params.push({ name: 'RA_cTitel', type: sql.NVarChar(255), value: raTitel });
        // Assuming LA anrede/titel are same as RA for now
        params.push({ name: 'LA_cAnrede', type: sql.NVarChar(255), value: raAnrede });
        params.push({ name: 'LA_cTitel', type: sql.NVarChar(255), value: raTitel });


        const sqlQuery = `
            BEGIN TRANSACTION;
            BEGIN TRY
                DECLARE @App_cAuftragsNr NVARCHAR(100) = N'EXTERN-' + CONVERT(NVARCHAR(50), GETDATE(), 112) + N'-N' + RIGHT('0000' + CAST(ABS(CHECKSUM(NEWID())) % 10000 AS VARCHAR(4)), 4);
                
                ${artikelListeSql}

                DECLARE @NeuerKAuftrag INT;

                INSERT INTO Verkauf.tAuftrag (
                    -- Columns you already had
                    kBenutzer, kKunde, cAuftragsNr, nType, dErstellt, dErstelltWawi,
                    kShop, kPlattform, kSprache, cWaehrung, fFaktor, kFirmaHistory, kWarenlager,
                    kZahlungsart, kVersandart, cVersandlandISO,
                    nBeschreibung, 
                    cInet, nSteuereinstellung, 


                    cVersandlandWaehrung, fVersandlandWaehrungFaktor,
                    nHatUpload, fZusatzGewicht, nStorno, nKomplettAusgeliefert,
                    nLieferPrioritaet, nPremiumVersand, nIstExterneRechnung, nIstReadOnly,
                    nArchiv, nReserviert, nAuftragStatus, fFinanzierungskosten,
                    nPending, kBenutzerErstellt, nSteuersonderbehandlung
                ) VALUES (
                    -- Values for columns you already had
                    @App_kBenutzer, @App_kKunde, @App_cAuftragsNr, 1, GETDATE(), GETDATE(),
                    @App_kShop, @App_kPlattform, @App_kSprache, @App_cWaehrung, @App_fWaehrungFaktor, @App_kFirma, @App_kWarenlager,
                    @App_kZahlungsart, @App_kVersandart, @LA_cISO,
                    0, -- nBeschreibung (default: 0 = standard)
                    '0', -- cInet (default: '0' = manuell)
                    0, -- nSteuereinstellung (default: 0 = Inland, anpassen falls nötig)


                    @App_cVersandlandWaehrung, @App_fVersandlandWaehrungFaktor,
                    0, -- nHatUpload (default: 0 = false)
                    0.0, -- fZusatzGewicht (default: 0.0)
                    0, -- nStorno (default: 0 = false)
                    0, -- nKomplettAusgeliefert (default: 0 = nicht komplett)
                    0, -- nLieferPrioritaet (default: 0 = normal)
                    0, -- nPremiumVersand (default: 0 = false)
                    0, -- nIstExterneRechnung (default: 0 = false)
                    0, -- nIstReadOnly (default: 0 = false, bearbeitbar)
                    0, -- nArchiv (default: 0 = false)
                    0, -- nReserviert (default: 0 = false)
                    0, -- nAuftragStatus (default: 0, spezifische Status sind WAWI-intern definiert)
                    0.0, -- fFinanzierungskosten (default: 0.0)
                    0, -- nPending (default: 0 = false)
                    @App_kBenutzer, -- kBenutzerErstellt (default: same as kBenutzer)
                    0  -- nSteuersonderbehandlung (default: 0 = keine)
                );
                SET @NeuerKAuftrag = SCOPE_IDENTITY();

                INSERT INTO Verkauf.tAuftragAdresse (
                    kAuftrag, kKunde, nTyp, cFirma, cAnrede, cTitel, cVorname, cName, cStrasse, cPLZ, cOrt, cLand, cISO, cTel, cMail, cZusatz
                ) VALUES (
                    @NeuerKAuftrag, @App_kKunde, 1, -- Billing Address
                    @RA_cFirma, @RA_cAnrede, @RA_cTitel, @RA_cVorname, @RA_cName, @RA_cStrasse, @RA_cPLZ, @RA_cOrt, @RA_cLand, @RA_cISO, @RA_cTel, @RA_cMail, @RA_cZusatz
                );

                INSERT INTO Verkauf.tAuftragAdresse (
                    kAuftrag, kKunde, nTyp, cFirma, cAnrede, cTitel, cVorname, cName, cStrasse, cPLZ, cOrt, cLand, cISO, cTel, cMail
                    -- cZusatz for shipping address can be different if needed
                ) VALUES (
                    @NeuerKAuftrag, @App_kKunde, 0, -- Shipping Address
                    @LA_cFirma, @LA_cAnrede, @LA_cTitel, @LA_cVorname, @LA_cName, @LA_cStrasse, @LA_cPLZ, @LA_cOrt, @LA_cLand, @LA_cISO, @LA_cTel, @LA_cMail
                );

                DECLARE cur CURSOR LOCAL FAST_FORWARD FOR SELECT kArtikel, fAnzahl, fPreisNetto, Reihenfolge FROM @App_ArtikelListe ORDER BY Reihenfolge;
                DECLARE @Pos_kArtikel INT, @Pos_fAnzahl DECIMAL(25,13), @Pos_fPreisNetto DECIMAL(25,13), @Pos_Reihenfolge INT;
                OPEN cur;
                FETCH NEXT FROM cur INTO @Pos_kArtikel, @Pos_fAnzahl, @Pos_fPreisNetto, @Pos_Reihenfolge;
                WHILE @@FETCH_STATUS = 0
                BEGIN
                    DECLARE @Pos_cArtNr NVARCHAR(200), @Pos_cName NVARCHAR(510), @Pos_kSteuerklasse INT, @Pos_fMwSt DECIMAL(25,13), @Pos_cEinheit NVARCHAR(510);
                    

                    SELECT TOP 1
                        @Pos_cArtNr = tA.cArtNr,
                        @Pos_cName = ISNULL(tAB.cName, tA.cArtNr),
                        @Pos_kSteuerklasse = tA.kSteuerklasse,
                        @Pos_fMwSt = ISNULL(
                                        (SELECT TOP 1 ts.fSteuersatz
                                        FROM dbo.tSteuersatz ts
                                        WHERE ts.kSteuerklasse = tA.kSteuerklasse
                                        AND ts.kSteuerzone = 1 -- <<< ADDED: Assuming kSteuerzone 1 is standard/domestic
                                        ORDER BY ts.nPrio DESC, ts.kSteuersatz DESC),
                                        0
                                    ),
                        @Pos_cEinheit = N''
                    FROM dbo.tArtikel tA
                    LEFT JOIN dbo.tArtikelBeschreibung tAB ON tA.kArtikel = tAB.kArtikel AND tAB.kSprache = @App_kSprache AND tAB.kPlattform = @App_kPlattform
                    WHERE tA.kArtikel = @Pos_kArtikel;

                    INSERT INTO Verkauf.tAuftragPosition (
                        kArtikel, kAuftrag, cArtNr, cName, fAnzahl, fVkNetto, fMwSt, nSort, kSteuerklasse, nType, cEinheit, 
                        fEkNetto, fRabatt, cNameStandard, cHinweis
                    ) VALUES (
                        @Pos_kArtikel, @NeuerKAuftrag, @Pos_cArtNr, @Pos_cName, @Pos_fAnzahl, @Pos_fPreisNetto, @Pos_fMwSt, @Pos_Reihenfolge, @Pos_kSteuerklasse, 1, @Pos_cEinheit,
                        0, 0, @Pos_cName, N'' -- Assuming cName is already in order language, no specific cHinweis
                    );

                    FETCH NEXT FROM cur INTO @Pos_kArtikel, @Pos_fAnzahl, @Pos_fPreisNetto, @Pos_Reihenfolge;
                END
                CLOSE cur; DEALLOCATE cur;

                DECLARE @tvpAuftragEckdaten Verkauf.TYPE_spAuftragEckdatenBerechnen;
                INSERT INTO @tvpAuftragEckdaten (kAuftrag) VALUES (@NeuerKAuftrag);
                EXEC Verkauf.spAuftragEckdatenBerechnen @auftrag = @tvpAuftragEckdaten;

                COMMIT TRANSACTION;
                SELECT @NeuerKAuftrag AS kAuftrag, @App_cAuftragsNr AS cAuftragsNr;
            END TRY
            BEGIN CATCH
                IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
                THROW;
            END CATCH;
        `;

        // Add debug logging for SQL query and parameters
        console.log('--- DEBUG: Generated SQL Query ---');
        console.log(sqlQuery.replace(/;/g, '\n'));
        console.log('--- DEBUG: SQL Parameters ---');
        console.log(params.map(p => `${p.name} (${p.type.name}): ${p.value}`).join('\n'));
        
        let transactionResult;
        try {
            transactionResult = await executeTransactionalQuery(sqlQuery, params);
            console.log('--- DEBUG: Transaction Result ---', transactionResult);
        } catch (error) {
            console.error('--- DEBUG: SQL Error Details ---');
            console.error('Full error object:', error);
            if (error instanceof Error) {
                console.error('Error message:', error.message);
                console.error('Stack trace:', error.stack);
            }
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }

        if (transactionResult.success && transactionResult.kAuftrag !== undefined && transactionResult.cAuftragsNr !== undefined) {
            return {
                success: true,
                jtlOrderId: transactionResult.kAuftrag,
                jtlOrderNumber: transactionResult.cAuftragsNr
            };
        } else {
            console.error('JTL order creation failed in transaction:', transactionResult.error);
            return { success: false, error: transactionResult.error || 'JTL order creation failed due to a SQL error.' };
        }

    } catch (error: any) {
        console.error('Error in createJtlOrder service:', error);
        return { success: false, error: error.message || 'An unexpected error occurred in the JTL order service.' };
    }
}

// Helper to get product details from the passed orderInput.products
// This replaces the direct call to getProductsForDeal and processing DealProductLink
// The frontend will now be responsible for constructing this product list with all necessary info.
// This function is not strictly needed anymore if products are passed in correctly
/*
function getOrderProducts(dealProducts: (DealProductLink & Product)[]): SimpleCrmOrderProduct[] {
    const orderProducts: SimpleCrmOrderProduct[] = [];
    for (const p of dealProducts) {
        if (p.jtl_kArtikel === null || p.jtl_kArtikel === undefined) {
            console.warn(\`Product \${p.name} (ID: \${p.id}) is missing jtl_kArtikel and will be skipped.\`);
            continue;
        }
        // Ensure price_at_time_of_adding is used and is a number
        const priceForSql = p.price_at_time_of_adding;
        if (priceForSql === null || priceForSql === undefined) {
             console.warn(\`Product \${p.name} (ID: \${p.id}) is missing a price (price_at_time_of_adding) and will be skipped.\`);
             continue;
        }
        orderProducts.push({
            jtl_kArtikel: p.jtl_kArtikel,
            quantity: p.quantity,
            price_at_time_of_adding: priceForSql
        });
    }
    return orderProducts;
}
*/
