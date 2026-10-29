package com.connect.app.data.api

import com.connect.app.data.model.AdminActionRequest
import com.connect.app.data.model.AdminBadgeRequest
import com.connect.app.data.model.AdminUser
import com.connect.app.data.model.AssignBadgeRequest
import com.connect.app.data.model.AuthRequest
import com.connect.app.data.model.AuthResponse
import com.connect.app.data.model.BugReport
import com.connect.app.data.model.ProfileResponse
import com.connect.app.data.model.UploadResponse
import com.connect.app.data.model.UserBadge
import com.connect.app.data.prefs.PreferencesManager
import okhttp3.MultipartBody
import okhttp3.OkHttpClient
import okhttp3.RequestBody
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Response
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import retrofit2.http.Body
import retrofit2.http.DELETE
import retrofit2.http.GET
import retrofit2.http.Header
import retrofit2.http.Multipart
import retrofit2.http.POST
import retrofit2.http.Part
import retrofit2.http.Path
import java.util.concurrent.TimeUnit

interface ApiService {
    @POST("register")
    suspend fun register(@Body body: AuthRequest): Response<AuthResponse>

    @POST("login")
    suspend fun login(@Body body: AuthRequest): Response<AuthResponse>

    @Multipart
    @POST("upload")
    suspend fun uploadFile(
        @Header("Authorization") auth: String?,
        @Part file: MultipartBody.Part
    ): Response<UploadResponse>

    @Multipart
    @POST("upload-avatar")
    suspend fun uploadAvatar(
        @Header("Authorization") auth: String?,
        @Part avatar: MultipartBody.Part,
        @Part("username") username: RequestBody
    ): Response<ProfileResponse>

    @Multipart
    @POST("upload-profile-media")
    suspend fun uploadProfileMedia(
        @Header("Authorization") auth: String?,
        @Part file: MultipartBody.Part,
        @Part("username") username: RequestBody? = null
    ): Response<Map<String, Any>>

    @POST("update-profile")
    suspend fun updateProfile(
        @Header("Authorization") auth: String?,
        @Body body: com.connect.app.data.model.UpdateProfileRequest
    ): Response<com.connect.app.data.model.UpdateProfileResponse>


    @Multipart
    @POST("update-friend-override")
    suspend fun updateFriendOverride(
        @Header("Authorization") auth: String?,
        @Part("friend_username") friendUsername: RequestBody,
        @Part("local_display_name") localDisplayName: RequestBody?,
        @Part localAvatar: MultipartBody.Part?,
        @Part("reset") reset: RequestBody?
    ): Response<Map<String, Any>>

    // Admin & Moderation routes
    @GET("admin/users")
    suspend fun getAdminUsers(
        @Header("Authorization") auth: String?
    ): Response<List<AdminUser>>

    @POST("admin/user-action")
    suspend fun adminUserAction(
        @Header("Authorization") auth: String?,
        @Body body: AdminActionRequest
    ): Response<Map<String, Any>>

    @GET("admin/badges")
    suspend fun getAdminBadges(
        @Header("Authorization") auth: String?
    ): Response<List<UserBadge>>

    @POST("admin/badges")
    suspend fun createAdminBadge(
        @Header("Authorization") auth: String?,
        @Body body: AdminBadgeRequest
    ): Response<Map<String, Any>>

    @DELETE("admin/badges/{id}")
    suspend fun deleteAdminBadge(
        @Header("Authorization") auth: String?,
        @Path("id") id: Long
    ): Response<Map<String, Any>>

    @POST("admin/assign-badge")
    suspend fun assignAdminBadge(
        @Header("Authorization") auth: String?,
        @Body body: AssignBadgeRequest
    ): Response<Map<String, Any>>

    // Bug reports
    @Multipart
    @POST("report-bug")
    suspend fun reportBug(
        @Part("reporter") reporter: RequestBody,
        @Part("description") description: RequestBody,
        @Part files: List<MultipartBody.Part>
    ): Response<Map<String, Any>>

    @GET("bug-reports")
    suspend fun getBugReports(): Response<List<BugReport>>

    @POST("resolve-bug")
    suspend fun resolveBug(
        @Body body: Map<String, Long>
    ): Response<Map<String, Any>>
}

class ApiClient(private val prefs: PreferencesManager) {

    private fun buildOkHttpClient(): OkHttpClient {
        val logging = HttpLoggingInterceptor().apply {
            level = HttpLoggingInterceptor.Level.BASIC
        }
        return OkHttpClient.Builder()
            .addInterceptor(logging)
            .connectTimeout(15, TimeUnit.SECONDS)
            .readTimeout(20, TimeUnit.SECONDS)
            .writeTimeout(20, TimeUnit.SECONDS)
            .build()
    }

    private fun getRetrofit(): Retrofit {
        var base = prefs.getServerUrl()
        if (!base.endsWith("/")) {
            base += "/"
        }
        return Retrofit.Builder()
            .baseUrl(base)
            .client(buildOkHttpClient())
            .addConverterFactory(GsonConverterFactory.create())
            .build()
    }

    val service: ApiService
        get() = getRetrofit().create(ApiService::class.java)

    fun getMediaUrl(path: String?): String {
        if (path.isNullOrBlank()) return ""
        val clean = path.trim()
        if (clean.startsWith("blob:") || clean.startsWith("data:") || clean.startsWith("file://") || clean.startsWith("content://")) return clean

        val base = prefs.getServerUrl().trimEnd('/')
        val normalized = clean.replace("\\", "/")

        val uploadsIdx = normalized.indexOf("/uploads/")
        if (uploadsIdx != -1) {
            val relativePath = normalized.substring(uploadsIdx)
            return "$base$relativePath"
        }

        return when {
            normalized.startsWith("http://") || normalized.startsWith("https://") -> normalized
            normalized.startsWith("/") -> "$base$normalized"
            else -> "$base/$normalized"
        }
    }
}
