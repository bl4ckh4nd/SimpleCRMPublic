import sql from 'mssql'; // Import sql for types
import { getMssqlSettingsWithKeytar, executeTransactionalQuery } from './mssql-keytar-service';
import { getCustomerById } from './sqlite-service';

// Define the structure for products as expected in orderInput, locally to avoid pathing issues
interface OrderInputProduct {
    kArtikel: number;
    cName: string;
    cArtNr: string;
    nAnzahl: number;
    fPreis: number;
}

interface SimpleCrmOrderInput {
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
            { name: 'App_cWaehrung', type: sql.NVarChar(3), value: cWaehrung },
            { name: 'App_fWaehrungFaktor', type: sql.Decimal(25, 13), value: fWaehrungFaktor },
            { name: 'App_cVersandlandWaehrung', type: sql.Char(3), value: cWaehrung },
            { name: 'App_fVersandlandWaehrungFaktor', type: sql.Decimal(25, 13), value: fWaehrungFaktor },

            // Rechnungsadresse from crmCustomer
            { name: 'RA_cFirma', type: sql.NVarChar(256), value: crmCustomer.company_name || (crmCustomer.is_company ? crmCustomer.company : null) },
            { name: 'RA_cVorname', type: sql.NVarChar(510), value: crmCustomer.is_company ? (crmCustomer.contact_person_name || '').split(' ')[0] : (crmCustomer.firstName || '').split(' ')[0] },
            { name: 'RA_cName', type: sql.NVarChar(510), value: crmCustomer.is_company ? (crmCustomer.contact_person_name || '').substring((crmCustomer.contact_person_name || '').indexOf(' ') + 1).trim() : (crmCustomer.name || '').substring((crmCustomer.name || '').indexOf(' ') + 1).trim()},
            { name: 'RA_cStrasse', type: sql.NVarChar(510), value: crmCustomer.street },
            { name: 'RA_cPLZ', type: sql.NVarChar(48), value: crmCustomer.zip },
            { name: 'RA_cOrt', type: sql.NVarChar(510), value: crmCustomer.city },
            { name: 'RA_cLand', type: sql.NVarChar(510), value: crmCustomer.country || 'Deutschland' },
            { name: 'RA_cISO', type: sql.NVarChar(10), value: (crmCustomer.country_iso || 'DE').toUpperCase() },
            { name: 'RA_cTel', type: sql.NVarChar(510), value: crmCustomer.phone || null },
            { name: 'RA_cMail', type: sql.NVarChar(510), value: crmCustomer.email || null },
            { name: 'RA_cZusatz', type: sql.NVarChar(510), value: crmCustomer.notes || null },

            // Lieferadresse (same as billing for now)
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

        // Extract cAnrede and cTitel from salutation
        const salutation = crmCustomer.salutation || "";
        let raAnrede: string | null = null;
        let raTitel: string | null = null;
        if (salutation.includes("Herr")) raAnrede = "Herr";
        if (salutation.includes("Frau")) raAnrede = "Frau";
        if (salutation.toLowerCase().includes("dr.")) raTitel = "Dr.";
        if (salutation.toLowerCase().includes("prof.")) raTitel = "Prof.";

        params.push({ name: 'RA_cAnrede', type: sql.NVarChar(255), value: raAnrede });
        params.push({ name: 'RA_cTitel', type: sql.NVarChar(255), value: raTitel });
        params.push({ name: 'LA_cAnrede', type: sql.NVarChar(255), value: raAnrede });
        params.push({ name: 'LA_cTitel', type: sql.NVarChar(255), value: raTitel });


        const sqlQuery = `
            BEGIN TRANSACTION;
            BEGIN TRY
                DECLARE @App_cAuftragsNr NVARCHAR(100) = N'EXTERN-' + CONVERT(NVARCHAR(50), GETDATE(), 112) + N'-N' + RIGHT('0000' + CAST(ABS(CHECKSUM(NEWID())) % 10000 AS VARCHAR(4)), 4);

                ${artikelListeSql}

                DECLARE @NeuerKAuftrag INT;

                -- Step 1: Resolve kFirmaHistory for correct tax calculation
                DECLARE @kFirmaHistory INT;
                SELECT TOP 1 @kFirmaHistory = kFirmaHistory
                FROM dbo.tFirmaHistory
                WHERE kFirma = @App_kFirma
                ORDER BY dErstellt DESC;

                IF @kFirmaHistory IS NULL
                BEGIN
                    RAISERROR('kFirmaHistory could not be resolved for kFirma %d. Cannot create order without valid firm snapshot.', 16, 1, @App_kFirma);
                END

                -- Step 2: INSERT main order record
                INSERT INTO Verkauf.tAuftrag (
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
                    @App_kBenutzer, @App_kKunde, @App_cAuftragsNr, 1, GETDATE(), GETDATE(),
                    @App_kShop, @App_kPlattform, @App_kSprache, @App_cWaehrung, @App_fWaehrungFaktor, @kFirmaHistory, @App_kWarenlager,
                    @App_kZahlungsart, @App_kVersandart, @LA_cISO,
                    0, -- nBeschreibung
                    '0', -- cInet (manuell)
                    0, -- nSteuereinstellung (Inland)
                    @App_cVersandlandWaehrung, @App_fVersandlandWaehrungFaktor,
                    0, -- nHatUpload
                    0.0, -- fZusatzGewicht
                    0, -- nStorno
                    0, -- nKomplettAusgeliefert
                    0, -- nLieferPrioritaet
                    0, -- nPremiumVersand
                    0, -- nIstExterneRechnung
                    0, -- nIstReadOnly
                    0, -- nArchiv
                    0, -- nReserviert
                    0, -- nAuftragStatus
                    0.0, -- fFinanzierungskosten
                    0, -- nPending
                    @App_kBenutzer, -- kBenutzerErstellt
                    0  -- nSteuersonderbehandlung
                );
                SET @NeuerKAuftrag = SCOPE_IDENTITY();

                -- Step 3: INSERT billing address (nTyp=1)
                INSERT INTO Verkauf.tAuftragAdresse (
                    kAuftrag, kKunde, nTyp, cFirma, cAnrede, cTitel, cVorname, cName, cStrasse, cPLZ, cOrt, cLand, cISO, cTel, cMail, cZusatz
                ) VALUES (
                    @NeuerKAuftrag, @App_kKunde, 1,
                    @RA_cFirma, @RA_cAnrede, @RA_cTitel, @RA_cVorname, @RA_cName, @RA_cStrasse, @RA_cPLZ, @RA_cOrt, @RA_cLand, @RA_cISO, @RA_cTel, @RA_cMail, @RA_cZusatz
                );

                -- Step 4: INSERT shipping address (nTyp=0)
                INSERT INTO Verkauf.tAuftragAdresse (
                    kAuftrag, kKunde, nTyp, cFirma, cAnrede, cTitel, cVorname, cName, cStrasse, cPLZ, cOrt, cLand, cISO, cTel, cMail
                ) VALUES (
                    @NeuerKAuftrag, @App_kKunde, 0,
                    @LA_cFirma, @LA_cAnrede, @LA_cTitel, @LA_cVorname, @LA_cName, @LA_cStrasse, @LA_cPLZ, @LA_cOrt, @LA_cLand, @LA_cISO, @LA_cTel, @LA_cMail
                );

                -- Step 5: INSERT payment info record
                INSERT INTO Verkauf.tAuftragZahlungsinfo (
                    kAuftrag, nTyp, cKontoInhaber, cBankname, cIBAN, cBIC,
                    cMandatsReferenz, cVerwendungszweck, dFaelligkeitsdatum,
                    cGlaeubigerID, cEndToEndID, cReferenzEmail, cPuiZahlungsinfo
                ) VALUES (
                    @NeuerKAuftrag, 0, NULL, NULL, NULL, NULL,
                    NULL, NULL, NULL,
                    NULL, NULL, NULL, NULL
                );

                -- Step 6: INSERT order positions with nReserviert=1 and fFaktor=1.0
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
                                        AND ts.kSteuerzone = 1
                                        ORDER BY ts.nPrio DESC, ts.kSteuersatz DESC),
                                        0
                                    ),
                        @Pos_cEinheit = N''
                    FROM dbo.tArtikel tA
                    LEFT JOIN dbo.tArtikelBeschreibung tAB ON tA.kArtikel = tAB.kArtikel AND tAB.kSprache = @App_kSprache AND tAB.kPlattform = @App_kPlattform
                    WHERE tA.kArtikel = @Pos_kArtikel;

                    INSERT INTO Verkauf.tAuftragPosition (
                        kArtikel, kAuftrag, cArtNr, cName, fAnzahl, fVkNetto, fMwSt, nSort, kSteuerklasse, nType, cEinheit,
                        fEkNetto, fRabatt, cNameStandard, cHinweis, nReserviert, fFaktor
                    ) VALUES (
                        @Pos_kArtikel, @NeuerKAuftrag, @Pos_cArtNr, @Pos_cName, @Pos_fAnzahl, @Pos_fPreisNetto, @Pos_fMwSt, @Pos_Reihenfolge, @Pos_kSteuerklasse, 1, @Pos_cEinheit,
                        0, 0, @Pos_cName, N'', 1, 1.0
                    );

                    FETCH NEXT FROM cur INTO @Pos_kArtikel, @Pos_fAnzahl, @Pos_fPreisNetto, @Pos_Reihenfolge;
                END
                CLOSE cur; DEALLOCATE cur;

                -- Step 7: First Eckdaten pass (creates tAuftragEckdaten + tAuftragPositionEckdaten rows)
                DECLARE @tvp1 Verkauf.TYPE_spAuftragEckdatenBerechnen;
                INSERT INTO @tvp1 (kAuftrag) VALUES (@NeuerKAuftrag);
                EXEC Verkauf.spAuftragEckdatenBerechnen @Auftrag = @tvp1;

                -- Step 8: Compute correct tax keys on every position (needs tAuftragPositionEckdaten to exist)
                DECLARE @tvp2 dbo.TYPE_Int;
                INSERT INTO @tvp2 (kInt) VALUES (@NeuerKAuftrag);
                EXEC Steuern.spAuftragSteuerschluesselAktualisieren @AuftragIds = @tvp2;

                -- Step 9: Second Eckdaten pass (recalculates with corrected tax keys)
                DECLARE @tvp3 Verkauf.TYPE_spAuftragEckdatenBerechnen;
                INSERT INTO @tvp3 (kAuftrag) VALUES (@NeuerKAuftrag);
                EXEC Verkauf.spAuftragEckdatenBerechnen @Auftrag = @tvp3;

                COMMIT TRANSACTION;
                SELECT @NeuerKAuftrag AS kAuftrag, @App_cAuftragsNr AS cAuftragsNr;
            END TRY
            BEGIN CATCH
                IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
                THROW;
            END CATCH;
        `;

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
