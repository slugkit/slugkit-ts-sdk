import { DictionaryStats, DictionaryTag, PatternInfo, ShortenPatternRequest, ShortenPatternResponse } from './types';
import { JWK_ENDPOINTS, FORGE_ENDPOINTS, STATS_ENDPOINTS, GENERATOR_ENDPOINTS, SHORTEN_ENDPOINTS } from './constants';

export class SlugKit {
    private backend!: string;
    private sdkSlug!: string;
    private privateKey!: CryptoKey;
    private refreshTimeout: NodeJS.Timeout | null = null;
    
    // Cache for dictionary data
    private dictionariesCache: DictionaryStats[] | null = null;
    private dictionaryTagsCache: DictionaryTag[] | null = null;

    private log(...args: any[]): void {
        console.log('[Slugkit]', ...args);
    }

    private error(...args: any[]): void {
        console.error('[Slugkit]', ...args);
    }

    private static logStatic(...args: any[]): void {
        console.log('[Slugkit]', ...args);
    }

    private static errorStatic(...args: any[]): void {
        console.error('[Slugkit]', ...args);
    }

    private static calculateRefreshTime(effectiveTo: string | null): number {
        const now = Date.now();
        if (!effectiveTo) {
            // If no expiration, refresh in 30 minutes with 1 minute jitter
            return now + 30 * 60 * 1000 + (Math.random() * 60 * 1000);
        }

        const expirationTime = new Date(effectiveTo).getTime();
        const timeUntilExpiration = expirationTime - now;

        if (timeUntilExpiration > 30 * 60 * 1000) {
            // If more than 30 minutes until expiration, refresh in 30 minutes with 1 minute jitter
            return now + 30 * 60 * 1000 + (Math.random() * 60 * 1000);
        } else {
            // If less than 30 minutes until expiration, refresh 2 minutes before with 20 seconds jitter
            return expirationTime - (2 * 60 * 1000) + (Math.random() * 20 * 1000);
        }
    }

    private static async fetchSdkKey(backend: string, sdkSlug: string): Promise<any> {
        SlugKit.logStatic('Fetching JWKs from backend');
        const body = {config: sdkSlug};
        const response = await fetch(`${backend}${JWK_ENDPOINTS.FETCH_SDK_KEYS}`, {method: 'POST', body: JSON.stringify(body)});
        const data = await response.json();
        
        // Get current time for comparison
        const now = new Date();
        
        // Filter and sort valid keys
        const validKeys = data
        .filter((key: any) => {
            const effectiveFrom = new Date(key.effective_from);
            const effectiveTo = key.effective_to ? new Date(key.effective_to) : null;
            return effectiveFrom <= now && (!effectiveTo || effectiveTo > now);
        })
        .sort((a: any, b: any) => {
            // Sort by effective_to (null is considered latest)
            if (!a.effective_to) return -1;
            if (!b.effective_to) return 1;
            return new Date(b.effective_to).getTime() - new Date(a.effective_to).getTime();
        });
        
        if (validKeys.length === 0) {
            SlugKit.errorStatic('No valid SDK keys found. All keys are either not yet effective or expired.');
            throw new Error('No valid SDK keys found');
        }
        
        // Use the first key (the one that expires latest)
        const selectedKey = validKeys[0];
        SlugKit.logStatic(`Selected SDK key: slug=${selectedKey.slug}, effectiveFrom=${selectedKey.effective_from}, effectiveTo=${selectedKey.effective_to}`);
        
        return selectedKey;
    }
    
    public static async fromJwk(backend: string, sdkSlug: string, jwk: JsonWebKey): Promise<SlugKit> {
        if (SlugKit.base64urlDecode(jwk.x || '').length !== 32 || SlugKit.base64urlDecode(jwk.y || '').length !== 32 ||
        SlugKit.base64urlDecode(jwk.d || '').length !== 32) {
            throw new Error('Invalid JWK');
        } else {
            SlugKit.logStatic('JWK is valid');
        }
        const privateKey =
        await crypto.subtle.importKey('jwk', jwk, {name: 'ECDSA', namedCurve: 'P-256'}, false, ['sign']);
        const slugkit = new SlugKit();
        slugkit.backend = backend;
        slugkit.sdkSlug = sdkSlug;
        slugkit.privateKey = privateKey;
        return slugkit;
    }
    
    public static async fromBackend(backend: string, sdkSlug: string, fallbackJwk: JsonWebKey | undefined): Promise<SlugKit> {
        try {
            const sdkKey = await SlugKit.fetchSdkKey(backend, sdkSlug);
            const slugkit = await SlugKit.fromJwk(backend, sdkSlug, sdkKey.jwk);
            slugkit.scheduleRefresh(sdkKey.effective_to, fallbackJwk);
            return slugkit;
        } catch (error) {
            SlugKit.errorStatic('Failed to fetch JWK from backend:', error);
            if (!fallbackJwk) {
                throw error;
            }
            SlugKit.logStatic('Using fallback JWK');
            // For fallback JWK, we don't know the expiration, so use 30 minutes refresh
            const slugkit = await SlugKit.fromJwk(backend, sdkSlug, fallbackJwk);
            slugkit.scheduleRefresh(null, fallbackJwk);
            return slugkit;
        }
    }
    
    private static base64urlEncode(data: Uint8Array): string {
        const base64 = btoa(String.fromCharCode(...data));
        return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    }
    
    private static base64urlDecode(data: string): Uint8Array {
        const base64 = data.replace(/-/g, '+').replace(/_/g, '/');
        return new Uint8Array(atob(base64).split('').map(c => c.charCodeAt(0)));
    }
    
    private scheduleRefresh(effectiveTo: string | null, fallbackJwk: JsonWebKey | undefined) {
        if (this.refreshTimeout) {
            clearTimeout(this.refreshTimeout);
        }

        const refreshTime = SlugKit.calculateRefreshTime(effectiveTo);
        const timeUntilRefresh = refreshTime - Date.now();
        this.log(`Scheduling key refresh in ${Math.round(timeUntilRefresh / 1000)} seconds`);

        this.refreshTimeout = setTimeout(() => this.refresh(fallbackJwk), timeUntilRefresh);
    }

    private async refresh(fallbackJwk: JsonWebKey | undefined) {
        try {
            const newSdkKey = await SlugKit.fetchSdkKey(this.backend, this.sdkSlug);
            // Update our instance with the new key
            this.privateKey = await crypto.subtle.importKey('jwk', newSdkKey.jwk, {name: 'ECDSA', namedCurve: 'P-256'}, false, ['sign']);
            this.log('Key refreshed successfully');
            // Schedule next refresh
            this.scheduleRefresh(newSdkKey.effective_to, fallbackJwk);
        } catch (error) {
            this.error('Failed to refresh key:', error);
            if (fallbackJwk) {
                // If we have a fallback, use it and schedule refresh in 30 minutes
                this.privateKey = await crypto.subtle.importKey('jwk', fallbackJwk, {name: 'ECDSA', namedCurve: 'P-256'}, false, ['sign']);
                this.log('Using fallback JWK after refresh failure');
                this.scheduleRefresh(null, fallbackJwk);
            }
        }
    }

    public async sign(message: string): Promise<string> {
        const encoded = new TextEncoder().encode(message);
        const signature = await crypto.subtle.sign({name: 'ECDSA', hash: 'SHA-256'}, this.privateKey, encoded);
        return SlugKit.base64urlEncode(new Uint8Array(signature));
    }

    private async signRequest(method: string, path: string, timestamp: string): Promise<string> {
        const payload = `${method} ${path}:${this.sdkSlug}:${timestamp}:`;
        const signature = await this.sign(payload);
        return signature;
    }

    private async fetch(method: string, path: string, body: string): Promise<Response> {
        const headers: Record<string, string> = {'Content-Type': 'application/json'};
        const timestamp = new Date().toISOString();
        try {
            const signature = await this.signRequest(method, path, timestamp);
            headers['X-Timestamp'] = timestamp;
            headers['X-Sdk-Slug'] = this.sdkSlug;
            headers['X-Signature'] = signature;
        } catch (error) {
            this.error('Failed to sign request:', error);
            throw new Error('Failed to sign request: ' + (error instanceof Error ? error.message : String(error)));
        }

        try {
            const requestSpec: RequestInit = {method, headers};
            if (method !== 'GET') {
                requestSpec.body = body;
            }
            const response = await fetch(`${this.backend}${path}`, requestSpec);
            
            if (!response.ok) {
                let errorMessage = `Request to ${path} failed with status ${response.status}`;
                try {
                    const errorData = await response.json();
                    errorMessage = errorData.message || errorMessage;
                } catch (e) {
                    // If we can't parse the error response as JSON, use the status text
                    errorMessage = response.statusText || errorMessage;
                }
                
                // Handle specific HTTP status codes
                switch (response.status) {
                    case 401:
                        throw new Error('Authentication failed: ' + errorMessage);
                    case 403:
                        // Try to refresh the key and retry the request
                        this.log('Received 403, attempting to refresh key');
                        await this.refresh(undefined);
                        // Retry the request with the new key
                        const newSignature = await this.signRequest(method, path, timestamp);
                        headers['X-Signature'] = newSignature;
                        const retryResponse = await fetch(`${this.backend}${path}`, {method, headers, body});
                        if (!retryResponse.ok) {
                            throw new Error('Request failed after key refresh: ' + errorMessage);
                        }
                        return retryResponse;
                    case 404:
                        throw new Error('Resource not found: ' + errorMessage);
                    case 429:
                        throw new Error('Rate limit exceeded: ' + errorMessage);
                    default:
                        throw new Error(errorMessage);
                }
            }
            return response;
        } catch (error) {
            this.error('Failed to fetch:', error);
            if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
                // Handle CORS and network errors
                throw new Error('Network error: Unable to reach the server. This might be due to CORS issues or the server being unavailable.');
            }
            // Re-throw other errors
            throw error;
        }
    }

    public async forgeSlugs(pattern: string, count: number, seed: string|undefined, sequence: number|undefined): Promise<string[]> {
        try {
            const body: Record<string, any> = {pattern, count};
            if (seed) {
                body['seed'] = seed;
            }
            if (sequence) {
                body['sequence'] = sequence;
            }
            const bodyString = JSON.stringify(body);
            const response = await this.fetch('POST', FORGE_ENDPOINTS.GENERATE_SLUGS, bodyString);
            // TODO: handle errors
            const data = await response.json();
            return Array.isArray(data) ? data : [];
        } catch (error) {
            this.error('Failed to get random slugs:', error);
            throw error;
        }
    }

    /**
     * @deprecated Use getPatternInfo() instead, which provides more comprehensive pattern information
     */
    public async checkCapacity(pattern: string): Promise<number> {
        const body = {pattern};
        const bodyString = JSON.stringify(body);
        const response = await this.fetch('POST', FORGE_ENDPOINTS.CHECK_CAPACITY, bodyString);
        // TODO: handle errors
        const data = await response.json();
        return typeof data === 'string' ? Number(data) : 0;
    }

    public async getPatternInfo(pattern: string): Promise<PatternInfo> {
        const body = {pattern};
        const bodyString = JSON.stringify(body);
        const response = await this.fetch('POST', FORGE_ENDPOINTS.GET_PATTERN_INFO, bodyString);
        const data = await response.json();
        return data as PatternInfo;
    }

    /**
     * Get total stats for all events (service-wide).
     * @returns Array of stats objects with event type, date part, total count, request count, total duration in microseconds, and average duration in microseconds.
     */
    public async getStatsTotal(): Promise<{
                event_type: string,
                date_part: string,
                total_count: number,
                request_count: number,
                total_duration_us: number,
                avg_duration_us: number
            }[]> {
        const response = await this.fetch('GET', STATS_ENDPOINTS.GET_TOTALS, '');
        // TODO: handle errors
        const data = await response.json();
        return data;
    }

    /**
     * Fetch dictionary statistics from the backend.
     * @returns Promise resolving to an array of dictionary statistics
     */
    public async fetchDictionaries(): Promise<DictionaryStats[]> {
        try {
            const response = await this.fetch('GET', GENERATOR_ENDPOINTS.GET_DICTIONARY_STATS, '');
            const data = await response.json();
            return Array.isArray(data) ? data : [];
        } catch (error) {
            this.error('Failed to fetch dictionary statistics:', error);
            throw error;
        }
    }

    /**
     * Get dictionary statistics with caching.
     * Returns cached data if available, otherwise fetches from backend and caches the result.
     * @returns Promise resolving to an array of dictionary statistics
     */
    public async getDictionaries(): Promise<DictionaryStats[]> {
        if (this.dictionariesCache !== null) {
            return this.dictionariesCache;
        }
        
        try {
            const dictionaries = await this.fetchDictionaries();
            this.dictionariesCache = dictionaries;
            return dictionaries;
        } catch (error) {
            this.error('Failed to get dictionaries:', error);
            throw error;
        }
    }

    /**
     * Fetch dictionary tags from the backend.
     * @returns Promise resolving to an array of dictionary tags
     */
    public async fetchDictionaryTags(): Promise<DictionaryTag[]> {
        try {
            const response = await this.fetch('GET', GENERATOR_ENDPOINTS.GET_TAGS, '');
            const data = await response.json();
            return Array.isArray(data) ? data : [];
        } catch (error) {
            this.error('Failed to fetch dictionary tags:', error);
            throw error;
        }
    }

    /**
     * Get dictionary tags with caching.
     * Returns cached data if available, otherwise fetches from backend and caches the result.
     * @returns Promise resolving to an array of dictionary tags
     */
    public async getDictionaryTags(): Promise<DictionaryTag[]> {
        if (this.dictionaryTagsCache !== null) {
            return this.dictionaryTagsCache;
        }
        
        try {
            const tags = await this.fetchDictionaryTags();
            this.dictionaryTagsCache = tags;
            return tags;
        } catch (error) {
            this.error('Failed to get dictionary tags:', error);
            throw error;
        }
    }

    /**
     * Shorten a pattern to a slug for sharing.
     * @param request The pattern shortening request
     * @returns Promise resolving to the shortened pattern response
     */
    public async shortenPattern(request: ShortenPatternRequest): Promise<ShortenPatternResponse> {
        try {
            const bodyString = JSON.stringify(request);
            const response = await this.fetch('POST', SHORTEN_ENDPOINTS.SHORTEN_PATTERN, bodyString);
            const data = await response.json();
            return data as ShortenPatternResponse;
        } catch (error) {
            this.error('Failed to shorten pattern:', error);
            throw error;
        }
    }

    /**
     * Expand a shortened pattern slug back to the original pattern.
     * @param slug The shortened slug to expand
     * @returns Promise resolving to the original pattern request
     */
    public async expandPattern(slug: string): Promise<ShortenPatternRequest> {
        try {
            const response = await this.fetch('GET', `${SHORTEN_ENDPOINTS.EXPAND_PATTERN}/${slug}`, '');
            const data = await response.json();
            return data as ShortenPatternRequest;
        } catch (error) {
            this.error('Failed to expand pattern:', error);
            throw error;
        }
    }
}

