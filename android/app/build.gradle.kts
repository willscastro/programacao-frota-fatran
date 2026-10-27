plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}
android {
    namespace = "br.com.fatran.motorista"
    compileSdk = 34
    defaultConfig {
        applicationId = "br.com.fatran.motorista"
        minSdk = 26
        targetSdk = 34
        versionCode = (project.findProperty("vCode") as String?)?.toInt() ?: 1
        versionName = "1." + ((project.findProperty("vCode") as String?) ?: "0")
    }
    signingConfigs {
        val ks = System.getenv("KEYSTORE_FILE")
        if (ks != null) create("fatran") {
            storeFile = file(ks)
            storePassword = System.getenv("KEYSTORE_SENHA")
            keyAlias = "fatran"
            keyPassword = System.getenv("KEYSTORE_SENHA")
        }
    }
    buildTypes {
        debug { signingConfigs.findByName("fatran")?.let { signingConfig = it } }
    }
    compileOptions { sourceCompatibility = JavaVersion.VERSION_17; targetCompatibility = JavaVersion.VERSION_17 }
    kotlinOptions { jvmTarget = "17" }
}
dependencies {
    implementation("androidx.core:core-ktx:1.13.1")
}
