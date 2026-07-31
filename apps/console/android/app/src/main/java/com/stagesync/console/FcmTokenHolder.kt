package com.stagesync.console

object FcmTokenHolder {
    @Volatile
    var token: String? = null
}
