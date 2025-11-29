/**
 * Secure Password Utilities
 * Uses Web Crypto API (PBKDF2) for password hashing
 * No external dependencies required
 */

const PasswordUtils = {
    // Configuration
    ITERATIONS: 100000,  // High iteration count for security
    KEY_LENGTH: 256,     // 256 bits
    SALT_LENGTH: 16,     // 16 bytes salt

    /**
     * Generate a cryptographically secure random salt
     * @returns {Uint8Array} Random salt bytes
     */
    generateSalt() {
        return crypto.getRandomValues(new Uint8Array(this.SALT_LENGTH));
    },

    /**
     * Convert ArrayBuffer to hex string
     * @param {ArrayBuffer} buffer
     * @returns {string} Hex string
     */
    bufferToHex(buffer) {
        return Array.from(new Uint8Array(buffer))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
    },

    /**
     * Convert hex string to Uint8Array
     * @param {string} hex
     * @returns {Uint8Array}
     */
    hexToBuffer(hex) {
        const bytes = new Uint8Array(hex.length / 2);
        for (let i = 0; i < hex.length; i += 2) {
            bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
        }
        return bytes;
    },

    /**
     * Hash a password using PBKDF2
     * @param {string} password - Plain text password
     * @param {Uint8Array} [salt] - Optional salt (generated if not provided)
     * @returns {Promise<{hash: string, salt: string}>} Hash and salt as hex strings
     */
    async hashPassword(password, salt = null) {
        // Generate salt if not provided
        if (!salt) {
            salt = this.generateSalt();
        }

        // Convert password to bytes
        const encoder = new TextEncoder();
        const passwordBytes = encoder.encode(password);

        // Import password as key material
        const keyMaterial = await crypto.subtle.importKey(
            'raw',
            passwordBytes,
            'PBKDF2',
            false,
            ['deriveBits']
        );

        // Derive bits using PBKDF2
        const derivedBits = await crypto.subtle.deriveBits(
            {
                name: 'PBKDF2',
                salt: salt,
                iterations: this.ITERATIONS,
                hash: 'SHA-256'
            },
            keyMaterial,
            this.KEY_LENGTH
        );

        // Return hash and salt as hex strings
        return {
            hash: this.bufferToHex(derivedBits),
            salt: this.bufferToHex(salt)
        };
    },

    /**
     * Verify a password against a stored hash
     * @param {string} password - Plain text password to verify
     * @param {string} storedHash - Stored hash (hex string)
     * @param {string} storedSalt - Stored salt (hex string)
     * @returns {Promise<boolean>} True if password matches
     */
    async verifyPassword(password, storedHash, storedSalt) {
        try {
            // Convert stored salt from hex to bytes
            const salt = this.hexToBuffer(storedSalt);

            // Hash the provided password with the same salt
            const { hash } = await this.hashPassword(password, salt);

            // Compare hashes (timing-safe comparison)
            return this.timingSafeEqual(hash, storedHash);
        } catch (error) {
            return false;
        }
    },

    /**
     * Timing-safe string comparison to prevent timing attacks
     * @param {string} a
     * @param {string} b
     * @returns {boolean}
     */
    timingSafeEqual(a, b) {
        if (a.length !== b.length) {
            return false;
        }

        let result = 0;
        for (let i = 0; i < a.length; i++) {
            result |= a.charCodeAt(i) ^ b.charCodeAt(i);
        }
        return result === 0;
    },

    /**
     * Check if a password hash is in the old base64 format
     * Old format: base64 encoded string (no salt)
     * New format: hash:salt (hex strings separated by colon)
     * @param {string} passwordHash
     * @returns {boolean}
     */
    isLegacyHash(passwordHash) {
        // New format contains a colon separator
        // Old base64 format doesn't contain colons
        return !passwordHash.includes(':');
    },

    /**
     * Verify password with automatic legacy format detection
     * Supports both old base64 and new PBKDF2 formats
     * @param {string} password - Plain text password
     * @param {string} storedPassword - Stored password (legacy base64 or new hash:salt format)
     * @returns {Promise<{valid: boolean, needsUpgrade: boolean}>}
     */
    async verifyPasswordWithLegacy(password, storedPassword) {
        if (this.isLegacyHash(storedPassword)) {
            // Legacy base64 format
            try {
                const decodedPassword = atob(storedPassword);
                const valid = decodedPassword === password;
                return { valid, needsUpgrade: valid }; // If valid, mark for upgrade
            } catch (e) {
                return { valid: false, needsUpgrade: false };
            }
        } else {
            // New format: hash:salt
            const [hash, salt] = storedPassword.split(':');
            const valid = await this.verifyPassword(password, hash, salt);
            return { valid, needsUpgrade: false };
        }
    },

    /**
     * Create a storable password string (hash:salt format)
     * @param {string} password - Plain text password
     * @returns {Promise<string>} Storable string in format "hash:salt"
     */
    async createPasswordHash(password) {
        const { hash, salt } = await this.hashPassword(password);
        return `${hash}:${salt}`;
    }
};

// Make available globally
window.PasswordUtils = PasswordUtils;
