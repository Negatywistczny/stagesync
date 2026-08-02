buildscript {
    repositories {
        google()
        mavenCentral()
    }
    dependencies {
        // AGP 9.x ships KGP 2.2.10; pin latest stable for built-in Kotlin.
        classpath("org.jetbrains.kotlin:kotlin-gradle-plugin:2.4.10")
    }
}

plugins {
    id("com.android.application") version "9.3.1" apply false
}
