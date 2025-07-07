import { ApprovalEnclave, RequestEnclave } from "tidecloak-js";

declare module "tidecloak-js" {
    const content: any;
    export default content;

    export {RequestEnclave, ApprovalEnclave};

    /**
     * Base class for all Tide requests.
     * Provides core request functionalities such as authorization, expiry, and encoding.
     */
    export class BaseTideRequest {
        name: string;
        version: string;
        authFlow: string;
        draft: Uint8Array;
        dyanmicData: Uint8Array;
        authorization: Uint8Array | null;
        authorizerCert: Uint8Array | null;
        authorizer: Uint8Array | null;
        expiry: bigint;

        constructor(name: string, version: string, authFlow: string, draft: Uint8Array, dyanmicData?: Uint8Array);

        setCustomExpiry(timeFromNowInSeconds: number): this;
        addAuthorizer(authorizer: Uint8Array): void;
        addAuthorizerCertificate(authorizerCertificate: Uint8Array): void;
        addAuthorization(authorization: Uint8Array): this;
        dataToAuthorize(): Promise<Uint8Array>;
        encode(): Uint8Array;
    }

    /**
     * Cardano transaction signing request.
     * This request handles serialization and signing for Cardano transactions.
     */
    export class CardanoTxBodySignRequest extends BaseTideRequest {
        constructor(authFlow: string);

        setInitializationCertificate(certificate: Uint8Array): void;
        setTxBody(txBody: Uint8Array): void;
        serializeDraft(): void;
        getDataToAuthorize(): Promise<Uint8Array>;
        getDraft(): Uint8Array;
        setDraft(draft: Uint8Array): void;
    }

    /**
     * Factory function to create a new Cardano transaction signing request.
     * @param initcert - Initial certificate in base64 string format.
     * @param txBody - Transaction body in Uint8Array format.
     * @returns A Promise resolving to a CardanoTxBodySignRequest instance.
     */
    export function CreateCardanoTxBodySignRequest(
        initcert: string,
        txBody: Uint8Array
    ): Promise<CardanoTxBodySignRequest>;


    export function StringFromUint8Array(data: Uint8Array): string;
    export function base64ToBytes(data: string): Uint8Array;
    export function bytesToBase64(data: Uint8Array): string;
    export function getHumanReadableObject(modelId: string, data: any, expiry: string);
}
