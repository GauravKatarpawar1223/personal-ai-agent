import java.util.Properties
plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

// Reads android/local.properties (gitignored, per-developer — mirrors
// how the web app uses .env.local instead of committing real values).
// Copy local.properties.example to local.properties and fill these in.
val localProps = Properties()
val localPropsFile = rootProject.file("local.properties")
if (localPropsFile.exists()) {
    localProps.load(localPropsFile.inputStream())
}

android {
    namespace = "com.personalaiagent.device"
    // ACTION_IME_ENTER (used by the "submit search" primitive) requires
    // API 30 — see DeviceAgentAccessibilityService.submitImeAction().
    // minSdk is lower so the app still installs and everything except
    // that one step works on older devices; that step fails honestly
    // there instead of crashing or faking success.
    compileSdk = 34

    defaultConfig {
        applicationId = "com.personalaiagent.device"
        minSdk = 26
        targetSdk = 34
        versionCode = 1
        versionName = "0.1-v0"

        buildConfigField("String", "SUPABASE_URL", "\"${localProps.getProperty("SUPABASE_URL", "")}\"")
        buildConfigField("String", "SUPABASE_PUBLISHABLE_KEY", "\"${localProps.getProperty("SUPABASE_PUBLISHABLE_KEY", "")}\"")
        buildConfigField("String", "BACKEND_BASE_URL", "\"${localProps.getProperty("BACKEND_BASE_URL", "")}\"")
    }

    buildFeatures {
        buildConfig = true
    }

    buildTypes {
        release {
            isMinifyEnabled = false
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions {
        jvmTarget = "17"
    }
}

dependencies {
    // Deliberately minimal — no networking/JSON/DI libraries. Networking
    // uses HttpURLConnection (built into the JDK), JSON uses org.json
    // (built into Android), matching this project's existing
    // "avoid unnecessary dependencies" convention on the web side.
    implementation("androidx.core:core-ktx:1.13.1")
    implementation("androidx.appcompat:appcompat:1.7.0")
    implementation("com.google.android.material:material:1.12.0")
}
