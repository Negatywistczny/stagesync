package com.stagesync.performer

/**
 * Holds the latest FCM token when Firebase Messaging is linked (optional google-services.json).
 * Without Firebase, [token] stays null — local notifications still work.
 */
object FcmTokenHolder {
    @Volatile
    var token: String? = null
}
