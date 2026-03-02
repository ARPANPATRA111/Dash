use spacetimedb::{table, reducer, Table, ReducerContext, Identity, Timestamp};

/// User account table - stores all registered users
#[table(name = user, public)]
pub struct User {
    #[primary_key]
    pub identity: Identity,
    #[unique]
    pub user_id: u64,
    #[unique]
    pub email: String,
    pub email_verified: bool,
    pub username: String,
    pub display_name: Option<String>,
    pub avatar_url: Option<String>,
    pub status_message: Option<String>,
    pub online: bool,
    pub last_seen: Timestamp,
    pub created_at: Timestamp,
    pub updated_at: Timestamp,
}

/// Email verification codes for new users
#[table(name = email_verification, public)]
pub struct EmailVerification {
    #[primary_key]
    #[unique]
    pub email: String,
    pub verification_code: String,
    pub identity: Identity,
    pub username: String,
    pub display_name: Option<String>,
    pub created_at: Timestamp,
    pub expires_at: Timestamp,
}

/// User session for tracking active connections
#[table(name = user_session, public)]
pub struct UserSession {
    #[primary_key]
    #[auto_inc]
    pub session_id: u64,
    #[index(btree)]
    pub user_identity: Identity,
    pub device_info: Option<String>,
    pub ip_address: Option<String>,
    pub connected_at: Timestamp,
    pub last_active: Timestamp,
}

/// User presence for real-time status tracking
#[table(name = user_presence, public)]
pub struct UserPresence {
    #[primary_key]
    pub user_identity: Identity,
    pub status: String, // "online", "away", "busy", "offline"
    pub custom_status: Option<String>,
    pub last_activity: Timestamp,
}

/// Conversation/Chat room table
#[table(name = conversation, public)]
pub struct Conversation {
    #[primary_key]
    #[auto_inc]
    pub conversation_id: u64,
    pub conversation_type: String, // "direct", "group"
    pub name: Option<String>,
    pub description: Option<String>,
    pub avatar_url: Option<String>,
    pub created_by: Identity,
    pub created_at: Timestamp,
    pub updated_at: Timestamp,
    pub is_archived: bool,
}

/// Conversation participants - links users to conversations
#[table(name = conversation_participant, public)]
pub struct ConversationParticipant {
    #[primary_key]
    #[auto_inc]
    pub participant_id: u64,
    #[index(btree)]
    pub conversation_id: u64,
    #[index(btree)]
    pub user_identity: Identity,
    pub role: String, // "owner", "admin", "member"
    pub joined_at: Timestamp,
    pub is_muted: bool,
    pub muted_until: Option<Timestamp>,
    pub last_read_message_id: Option<u64>,
    pub is_archived: bool,
    pub nickname: Option<String>,
}

/// Main message table
#[table(name = message, public)]
pub struct Message {
    #[primary_key]
    #[auto_inc]
    pub message_id: u64,
    #[index(btree)]
    pub conversation_id: u64,
    pub sender_identity: Identity,
    pub content: String,
    pub message_type: String, // "text", "image", "video", "file", "system"
    pub reply_to_message_id: Option<u64>,
    pub thread_root_id: Option<u64>,
    pub sent_at: Timestamp,
    pub edited_at: Option<Timestamp>,
    pub is_deleted: bool,
    pub is_pinned: bool,
    pub metadata: Option<String>, // JSON string for additional data
}

/// Message reactions (emoji reactions)
#[table(name = message_reaction, public)]
pub struct MessageReaction {
    #[primary_key]
    #[auto_inc]
    pub reaction_id: u64,
    #[index(btree)]
    pub message_id: u64,
    pub user_identity: Identity,
    pub emoji: String,
    pub created_at: Timestamp,
}

/// Read receipts for messages
#[table(name = read_receipt, public)]
pub struct ReadReceipt {
    #[primary_key]
    #[auto_inc]
    pub receipt_id: u64,
    #[index(btree)]
    pub message_id: u64,
    #[index(btree)]
    pub user_identity: Identity,
    pub read_at: Timestamp,
}

/// Typing indicators
#[table(name = typing_indicator, public)]
pub struct TypingIndicator {
    #[primary_key]
    #[auto_inc]
    pub typing_id: u64,
    #[index(btree)]
    pub conversation_id: u64,
    pub user_identity: Identity,
    pub started_at: Timestamp,
}

/// File attachments for messages
#[table(name = file_attachment, public)]
pub struct FileAttachment {
    #[primary_key]
    #[auto_inc]
    pub attachment_id: u64,
    #[index(btree)]
    pub message_id: u64,
    pub file_name: String,
    pub file_type: String,
    pub file_size: u64,
    pub file_url: String,
    pub thumbnail_url: Option<String>,
    pub uploaded_at: Timestamp,
}

/// User notifications
#[table(name = notification, public)]
pub struct Notification {
    #[primary_key]
    #[auto_inc]
    pub notification_id: u64,
    #[index(btree)]
    pub user_identity: Identity,
    pub notification_type: String, // "message", "mention", "reaction", "system"
    pub title: String,
    pub body: String,
    pub data: Option<String>, // JSON for additional context
    pub is_read: bool,
    pub created_at: Timestamp,
}

#[table(name = user_counter)]
pub struct UserCounter {
    #[primary_key]
    pub id: u32,
    pub next_user_id: u64,
}

fn get_next_user_id(ctx: &ReducerContext) -> u64 {
    let counter = ctx.db.user_counter().id().find(0);
    match counter {
        Some(c) => {
            let next_id = c.next_user_id;
            ctx.db.user_counter().id().update(UserCounter {
                id: 0,
                next_user_id: next_id + 1,
            });
            next_id
        }
        None => {
            ctx.db.user_counter().insert(UserCounter {
                id: 0,
                next_user_id: 2,
            });
            1
        }
    }
}

fn validate_username(username: &str) -> Result<(), String> {
    if username.is_empty() {
        return Err("Username cannot be empty".to_string());
    }
    if username.len() < 3 {
        return Err("Username must be at least 3 characters".to_string());
    }
    if username.len() > 32 {
        return Err("Username must be at most 32 characters".to_string());
    }
    if !username.chars().all(|c| c.is_alphanumeric() || c == '_' || c == '-') {
        return Err("Username can only contain letters, numbers, underscores, and hyphens".to_string());
    }
    Ok(())
}

fn validate_message(text: &str) -> Result<(), String> {
    if text.is_empty() {
        return Err("Message cannot be empty".to_string());
    }
    if text.len() > 10000 {
        return Err("Message is too long (max 10000 characters)".to_string());
    }
    Ok(())
}

fn is_participant(ctx: &ReducerContext, conversation_id: u64, user_identity: Identity) -> bool {
    ctx.db.conversation_participant()
        .iter()
        .any(|p| p.conversation_id == conversation_id && p.user_identity == user_identity && !p.is_archived)
}

fn get_participant_role(ctx: &ReducerContext, conversation_id: u64, user_identity: Identity) -> Option<String> {
    ctx.db.conversation_participant()
        .iter()
        .find(|p| p.conversation_id == conversation_id && p.user_identity == user_identity)
        .map(|p| p.role.clone())
}


#[reducer(client_connected)]
pub fn client_connected(ctx: &ReducerContext) {
    log::info!("Client connected: {:?}", ctx.sender);
    
    if let Some(user) = ctx.db.user().identity().find(ctx.sender) {
        // Update existing user to online
        ctx.db.user().identity().update(User {
            online: true,
            last_seen: ctx.timestamp,
            updated_at: ctx.timestamp,
            ..user
        });
    }
    
    // Update or create presence
    if let Some(presence) = ctx.db.user_presence().user_identity().find(ctx.sender) {
        ctx.db.user_presence().user_identity().update(UserPresence {
            status: "online".to_string(),
            last_activity: ctx.timestamp,
            ..presence
        });
    }
    
    // Create session
    ctx.db.user_session().insert(UserSession {
        session_id: 0,
        user_identity: ctx.sender,
        device_info: None,
        ip_address: None,
        connected_at: ctx.timestamp,
        last_active: ctx.timestamp,
    });
}

#[reducer(client_disconnected)]
pub fn client_disconnected(ctx: &ReducerContext) {
    log::info!("Client disconnected: {:?}", ctx.sender);
    
    if let Some(user) = ctx.db.user().identity().find(ctx.sender) {
        ctx.db.user().identity().update(User {
            online: false,
            last_seen: ctx.timestamp,
            updated_at: ctx.timestamp,
            ..user
        });
    }
    
    // Update presence to offline
    if let Some(presence) = ctx.db.user_presence().user_identity().find(ctx.sender) {
        ctx.db.user_presence().user_identity().update(UserPresence {
            status: "offline".to_string(),
            last_activity: ctx.timestamp,
            ..presence
        });
    }
    
    // Remove typing indicators
    let typing_to_remove: Vec<u64> = ctx.db.typing_indicator()
        .iter()
        .filter(|t| t.user_identity == ctx.sender)
        .map(|t| t.typing_id)
        .collect();
    
    for typing_id in typing_to_remove {
        if let Some(_typing) = ctx.db.typing_indicator().typing_id().find(typing_id) {
            ctx.db.typing_indicator().typing_id().delete(typing_id);
        }
    }
}


/// Generate a 6-digit verification code
fn generate_verification_code() -> String {
    use std::collections::hash_map::DefaultHasher;
    use std::hash::{Hash, Hasher};
    
    let mut hasher = DefaultHasher::new();
    std::time::SystemTime::now().hash(&mut hasher);
    let hash = hasher.finish();
    format!("{:06}", hash % 1000000)
}

/// Request email verification - first step of registration
#[reducer]
pub fn request_email_verification(
    ctx: &ReducerContext,
    email: String,
    username: String,
    display_name: Option<String>,
) -> Result<(), String> {
    // Validate email format
    if !email.contains('@') || !email.contains('.') {
        return Err("Invalid email format".to_string());
    }
    
    let email_lower = email.to_lowercase().trim().to_string();
    
    validate_username(&username)?;
    
    // Check if email is already registered
    if ctx.db.user().iter().any(|u| u.email.to_lowercase() == email_lower) {
        return Err("Email already registered. Please login instead.".to_string());
    }
    
    // Check username uniqueness
    if ctx.db.user().iter().any(|u| u.username.to_lowercase() == username.to_lowercase()) {
        return Err("Username already taken".to_string());
    }
    
    // Generate verification code
    let code = generate_verification_code();
    
    // Set expiry to 10 minutes from now (in microseconds)
    let expires_at = Timestamp::from_micros_since_unix_epoch(
        ctx.timestamp.to_micros_since_unix_epoch() + 10 * 60 * 1_000_000
    );
    
    // Remove any existing verification request for this email
    if let Some(_existing) = ctx.db.email_verification().email().find(&email_lower) {
        ctx.db.email_verification().email().delete(&email_lower);
    }
    
    // Store verification request
    ctx.db.email_verification().insert(EmailVerification {
        email: email_lower.clone(),
        verification_code: code.clone(),
        identity: ctx.sender,
        username: username.clone(),
        display_name,
        created_at: ctx.timestamp,
        expires_at,
    });
    
    log::info!("Verification code {} sent to {} for user {}", code, email_lower, username);
    Ok(())
}

/// Verify email code and complete registration
#[reducer]
pub fn verify_email_and_register(ctx: &ReducerContext, email: String, code: String) -> Result<(), String> {
    let email_lower = email.to_lowercase().trim().to_string();
    
    // Find verification request
    let verification = ctx.db.email_verification().email().find(&email_lower)
        .ok_or("No pending verification found for this email. Please request a new code.")?;
    
    // Check expiry
    if ctx.timestamp.to_micros_since_unix_epoch() > verification.expires_at.to_micros_since_unix_epoch() {
        ctx.db.email_verification().email().delete(&email_lower);
        return Err("Verification code has expired. Please request a new one.".to_string());
    }
    
    // Check code
    if verification.verification_code != code {
        return Err("Invalid verification code".to_string());
    }
    
    // Check if user already exists with this identity
    if ctx.db.user().identity().find(ctx.sender).is_some() {
        ctx.db.email_verification().email().delete(&email_lower);
        return Err("User already registered".to_string());
    }
    
    // Check if email is already registered (race condition check)
    if ctx.db.user().iter().any(|u| u.email.to_lowercase() == email_lower) {
        ctx.db.email_verification().email().delete(&email_lower);
        return Err("Email already registered".to_string());
    }
    
    let user_id = get_next_user_id(ctx);
    
    // Create user
    ctx.db.user().insert(User {
        identity: ctx.sender,
        user_id,
        email: email_lower.clone(),
        email_verified: true,
        username: verification.username.clone(),
        display_name: Some(verification.display_name.clone().unwrap_or(verification.username.clone())),
        avatar_url: None,
        status_message: None,
        online: true,
        last_seen: ctx.timestamp,
        created_at: ctx.timestamp,
        updated_at: ctx.timestamp,
    });
    
    // Create presence
    ctx.db.user_presence().insert(UserPresence {
        user_identity: ctx.sender,
        status: "online".to_string(),
        custom_status: None,
        last_activity: ctx.timestamp,
    });
    
    // Clean up verification
    ctx.db.email_verification().email().delete(&email_lower);
    
    log::info!("User {} verified and registered with email {}", verification.username, email_lower);
    Ok(())
}

/// Check if email exists (for login flow)
#[reducer]
pub fn check_email_exists(ctx: &ReducerContext, email: String) -> Result<(), String> {
    let email_lower = email.to_lowercase().trim().to_string();
    
    if ctx.db.user().iter().any(|u| u.email.to_lowercase() == email_lower) {
        Ok(())
    } else {
        Err("Email not found. Please sign up first.".to_string())
    }
}

/// Login with email - sends verification code
#[reducer]
pub fn login_with_email(ctx: &ReducerContext, email: String) -> Result<(), String> {
    let email_lower = email.to_lowercase().trim().to_string();

    // Find user with this email
    let existing_user = ctx.db.user().iter()
        .find(|u| u.email.to_lowercase() == email_lower)
        .ok_or("Email not found. Please sign up first.")?;

    // If current identity already has a user profile
    if let Some(current_user) = ctx.db.user().identity().find(ctx.sender) {
        if current_user.email.to_lowercase() != existing_user.email.to_lowercase() {
            return Err("This session is associated with a different account. Please sign in again.".to_string());
        }

        log::info!("Login request for existing identity with email {}", email_lower);
        return Ok(());
    }

    // If this is a different identity for the same email, relink profile to the current identity.
    if existing_user.identity != ctx.sender {
        let old_identity = existing_user.identity;

        // Migrate user row first (delete old to preserve unique constraints).
        ctx.db.user().identity().delete(old_identity);
        ctx.db.user().insert(User {
            identity: ctx.sender,
            user_id: existing_user.user_id,
            email: existing_user.email,
            email_verified: true,
            username: existing_user.username,
            display_name: existing_user.display_name,
            avatar_url: existing_user.avatar_url,
            status_message: existing_user.status_message,
            online: true,
            last_seen: ctx.timestamp,
            created_at: existing_user.created_at,
            updated_at: ctx.timestamp,
        });

        // Migrate presence
        if let Some(old_presence) = ctx.db.user_presence().user_identity().find(old_identity) {
            ctx.db.user_presence().user_identity().delete(old_identity);
            ctx.db.user_presence().insert(UserPresence {
                user_identity: ctx.sender,
                status: old_presence.status,
                custom_status: old_presence.custom_status,
                last_activity: ctx.timestamp,
            });
        }

        // Migrate conversation participant links
        let participant_ids: Vec<u64> = ctx.db.conversation_participant().iter()
            .filter(|p| p.user_identity == old_identity)
            .map(|p| p.participant_id)
            .collect();
        for participant_id in participant_ids {
            if let Some(p) = ctx.db.conversation_participant().participant_id().find(participant_id) {
                ctx.db.conversation_participant().participant_id().update(ConversationParticipant {
                    user_identity: ctx.sender,
                    ..p
                });
            }
        }

        // Migrate notifications
        let notification_ids: Vec<u64> = ctx.db.notification().iter()
            .filter(|n| n.user_identity == old_identity)
            .map(|n| n.notification_id)
            .collect();
        for notification_id in notification_ids {
            if let Some(n) = ctx.db.notification().notification_id().find(notification_id) {
                ctx.db.notification().notification_id().update(Notification {
                    user_identity: ctx.sender,
                    ..n
                });
            }
        }

        // Migrate read receipts
        let receipt_ids: Vec<u64> = ctx.db.read_receipt().iter()
            .filter(|r| r.user_identity == old_identity)
            .map(|r| r.receipt_id)
            .collect();
        for receipt_id in receipt_ids {
            if let Some(r) = ctx.db.read_receipt().receipt_id().find(receipt_id) {
                ctx.db.read_receipt().receipt_id().update(ReadReceipt {
                    user_identity: ctx.sender,
                    ..r
                });
            }
        }

        // Migrate reactions
        let reaction_ids: Vec<u64> = ctx.db.message_reaction().iter()
            .filter(|r| r.user_identity == old_identity)
            .map(|r| r.reaction_id)
            .collect();
        for reaction_id in reaction_ids {
            if let Some(r) = ctx.db.message_reaction().reaction_id().find(reaction_id) {
                ctx.db.message_reaction().reaction_id().update(MessageReaction {
                    user_identity: ctx.sender,
                    ..r
                });
            }
        }

        // Migrate typing indicators
        let typing_ids: Vec<u64> = ctx.db.typing_indicator().iter()
            .filter(|t| t.user_identity == old_identity)
            .map(|t| t.typing_id)
            .collect();
        for typing_id in typing_ids {
            if let Some(t) = ctx.db.typing_indicator().typing_id().find(typing_id) {
                ctx.db.typing_indicator().typing_id().update(TypingIndicator {
                    user_identity: ctx.sender,
                    ..t
                });
            }
        }

        log::info!("Relinked account {} from old identity to current authenticated identity", email_lower);
    }

    log::info!("Login request for email {}", email_lower);
    Ok(())
}

/// Legacy register_user - kept for backwards compatibility but redirects to new flow
#[reducer]
pub fn register_user(ctx: &ReducerContext, username: String, email: Option<String>) -> Result<(), String> {
    validate_username(&username)?;
    
    // Check if user already exists
    if ctx.db.user().identity().find(ctx.sender).is_some() {
        return Err("User already registered".to_string());
    }
    
    // Check username uniqueness
    if ctx.db.user().iter().any(|u| u.username.to_lowercase() == username.to_lowercase()) {
        return Err("Username already taken".to_string());
    }
    
    let email_value = email
        .ok_or("Email is required. Please authenticate with Google before creating a profile.")?;
    let email_lower = email_value.to_lowercase();
    
    // Check email uniqueness
    if ctx.db.user().iter().any(|u| u.email.to_lowercase() == email_lower) {
        return Err("Email already registered".to_string());
    }
    
    let user_id = get_next_user_id(ctx);
    
    ctx.db.user().insert(User {
        identity: ctx.sender,
        user_id,
        email: email_lower,
        email_verified: true,
        username: username.clone(),
        display_name: Some(username.clone()),
        avatar_url: None,
        status_message: None,
        online: true,
        last_seen: ctx.timestamp,
        created_at: ctx.timestamp,
        updated_at: ctx.timestamp,
    });
    
    // Create presence
    ctx.db.user_presence().insert(UserPresence {
        user_identity: ctx.sender,
        status: "online".to_string(),
        custom_status: None,
        last_activity: ctx.timestamp,
    });
    
    log::info!("New user registered: {}", username);
    Ok(())
}

#[reducer]
pub fn update_profile(
    ctx: &ReducerContext,
    display_name: Option<String>,
    avatar_url: Option<String>,
    status_message: Option<String>,
) -> Result<(), String> {
    let user = ctx.db.user().identity().find(ctx.sender)
        .ok_or("User not found")?;
    
    ctx.db.user().identity().update(User {
        display_name: display_name.or(user.display_name),
        avatar_url: avatar_url.or(user.avatar_url),
        status_message: status_message.or(user.status_message),
        updated_at: ctx.timestamp,
        ..user
    });
    
    Ok(())
}

#[reducer]
pub fn update_username(ctx: &ReducerContext, username: String) -> Result<(), String> {
    validate_username(&username)?;
    
    let user = ctx.db.user().identity().find(ctx.sender)
        .ok_or("User not found")?;
    
    // Check username uniqueness (excluding current user)
    if ctx.db.user().iter().any(|u| u.username.to_lowercase() == username.to_lowercase() && u.identity != ctx.sender) {
        return Err("Username already taken".to_string());
    }
    
    ctx.db.user().identity().update(User {
        username,
        updated_at: ctx.timestamp,
        ..user
    });
    
    Ok(())
}

#[reducer]
pub fn set_presence(ctx: &ReducerContext, status: String, custom_status: Option<String>) -> Result<(), String> {
    let valid_statuses = ["online", "away", "busy", "offline"];
    if !valid_statuses.contains(&status.as_str()) {
        return Err("Invalid status. Must be: online, away, busy, or offline".to_string());
    }
    
    if let Some(presence) = ctx.db.user_presence().user_identity().find(ctx.sender) {
        ctx.db.user_presence().user_identity().update(UserPresence {
            status,
            custom_status,
            last_activity: ctx.timestamp,
            ..presence
        });
    } else {
        ctx.db.user_presence().insert(UserPresence {
            user_identity: ctx.sender,
            status,
            custom_status,
            last_activity: ctx.timestamp,
        });
    }
    
    Ok(())
}


#[reducer]
pub fn create_direct_conversation(ctx: &ReducerContext, other_user_identity: Identity) -> Result<(), String> {
    // Check if users exist
    if ctx.db.user().identity().find(ctx.sender).is_none() {
        return Err("You must be registered to create conversations".to_string());
    }
    if ctx.db.user().identity().find(other_user_identity).is_none() {
        return Err("Other user not found".to_string());
    }
    
    // Check if direct conversation already exists
    let existing = ctx.db.conversation_participant()
        .iter()
        .filter(|p| p.user_identity == ctx.sender)
        .filter_map(|p| ctx.db.conversation().conversation_id().find(p.conversation_id))
        .filter(|c| c.conversation_type == "direct")
        .any(|c| {
            ctx.db.conversation_participant()
                .iter()
                .any(|p| p.conversation_id == c.conversation_id && p.user_identity == other_user_identity)
        });
    
    if existing {
        return Err("Direct conversation already exists".to_string());
    }
    
    // Create conversation
    let conversation = ctx.db.conversation().insert(Conversation {
        conversation_id: 0,
        conversation_type: "direct".to_string(),
        name: None,
        description: None,
        avatar_url: None,
        created_by: ctx.sender,
        created_at: ctx.timestamp,
        updated_at: ctx.timestamp,
        is_archived: false,
    });
    
    // Add participants
    ctx.db.conversation_participant().insert(ConversationParticipant {
        participant_id: 0,
        conversation_id: conversation.conversation_id,
        user_identity: ctx.sender,
        role: "member".to_string(),
        joined_at: ctx.timestamp,
        is_muted: false,
        muted_until: None,
        last_read_message_id: None,
        is_archived: false,
        nickname: None,
    });
    
    ctx.db.conversation_participant().insert(ConversationParticipant {
        participant_id: 0,
        conversation_id: conversation.conversation_id,
        user_identity: other_user_identity,
        role: "member".to_string(),
        joined_at: ctx.timestamp,
        is_muted: false,
        muted_until: None,
        last_read_message_id: None,
        is_archived: false,
        nickname: None,
    });
    
    log::info!("Direct conversation created: {}", conversation.conversation_id);
    Ok(())
}

#[reducer]
pub fn create_group_conversation(
    ctx: &ReducerContext,
    name: String,
    description: Option<String>,
    member_identities: Vec<Identity>,
) -> Result<(), String> {
    if name.is_empty() {
        return Err("Group name cannot be empty".to_string());
    }
    if name.len() > 100 {
        return Err("Group name is too long".to_string());
    }
    
    if ctx.db.user().identity().find(ctx.sender).is_none() {
        return Err("You must be registered to create conversations".to_string());
    }
    
    // Create conversation
    let conversation = ctx.db.conversation().insert(Conversation {
        conversation_id: 0,
        conversation_type: "group".to_string(),
        name: Some(name.clone()),
        description,
        avatar_url: None,
        created_by: ctx.sender,
        created_at: ctx.timestamp,
        updated_at: ctx.timestamp,
        is_archived: false,
    });
    
    // Add creator as owner
    ctx.db.conversation_participant().insert(ConversationParticipant {
        participant_id: 0,
        conversation_id: conversation.conversation_id,
        user_identity: ctx.sender,
        role: "owner".to_string(),
        joined_at: ctx.timestamp,
        is_muted: false,
        muted_until: None,
        last_read_message_id: None,
        is_archived: false,
        nickname: None,
    });
    
    // Add other members
    for member_identity in member_identities {
        if member_identity != ctx.sender && ctx.db.user().identity().find(member_identity).is_some() {
            ctx.db.conversation_participant().insert(ConversationParticipant {
                participant_id: 0,
                conversation_id: conversation.conversation_id,
                user_identity: member_identity,
                role: "member".to_string(),
                joined_at: ctx.timestamp,
                is_muted: false,
                muted_until: None,
                last_read_message_id: None,
                is_archived: false,
                nickname: None,
            });
        }
    }
    
    // Send system message
    ctx.db.message().insert(Message {
        message_id: 0,
        conversation_id: conversation.conversation_id,
        sender_identity: ctx.sender,
        content: format!("Group '{}' created", name),
        message_type: "system".to_string(),
        reply_to_message_id: None,
        thread_root_id: None,
        sent_at: ctx.timestamp,
        edited_at: None,
        is_deleted: false,
        is_pinned: false,
        metadata: None,
    });
    
    log::info!("Group conversation created: {} ({})", name, conversation.conversation_id);
    Ok(())
}

#[reducer]
pub fn update_group(
    ctx: &ReducerContext,
    conversation_id: u64,
    name: Option<String>,
    description: Option<String>,
    avatar_url: Option<String>,
) -> Result<(), String> {
    let conversation = ctx.db.conversation().conversation_id().find(conversation_id)
        .ok_or("Conversation not found")?;
    
    if conversation.conversation_type != "group" {
        return Err("Can only update group conversations".to_string());
    }
    
    let role = get_participant_role(ctx, conversation_id, ctx.sender)
        .ok_or("You are not a member of this conversation")?;
    
    if role != "owner" && role != "admin" {
        return Err("Only owners and admins can update group settings".to_string());
    }
    
    ctx.db.conversation().conversation_id().update(Conversation {
        name: name.or(conversation.name),
        description: description.or(conversation.description),
        avatar_url: avatar_url.or(conversation.avatar_url),
        updated_at: ctx.timestamp,
        ..conversation
    });
    
    Ok(())
}

#[reducer]
pub fn add_group_member(ctx: &ReducerContext, conversation_id: u64, user_identity: Identity) -> Result<(), String> {
    let conversation = ctx.db.conversation().conversation_id().find(conversation_id)
        .ok_or("Conversation not found")?;
    
    if conversation.conversation_type != "group" {
        return Err("Can only add members to group conversations".to_string());
    }
    
    let role = get_participant_role(ctx, conversation_id, ctx.sender)
        .ok_or("You are not a member of this conversation")?;
    
    if role != "owner" && role != "admin" {
        return Err("Only owners and admins can add members".to_string());
    }
    
    if ctx.db.user().identity().find(user_identity).is_none() {
        return Err("User not found".to_string());
    }
    
    if is_participant(ctx, conversation_id, user_identity) {
        return Err("User is already a member".to_string());
    }
    
    ctx.db.conversation_participant().insert(ConversationParticipant {
        participant_id: 0,
        conversation_id,
        user_identity,
        role: "member".to_string(),
        joined_at: ctx.timestamp,
        is_muted: false,
        muted_until: None,
        last_read_message_id: None,
        is_archived: false,
        nickname: None,
    });
    
    // System message
    let adder = ctx.db.user().identity().find(ctx.sender).map(|u| u.username).unwrap_or_default();
    let added = ctx.db.user().identity().find(user_identity).map(|u| u.username).unwrap_or_default();
    
    ctx.db.message().insert(Message {
        message_id: 0,
        conversation_id,
        sender_identity: ctx.sender,
        content: format!("{} added {} to the group", adder, added),
        message_type: "system".to_string(),
        reply_to_message_id: None,
        thread_root_id: None,
        sent_at: ctx.timestamp,
        edited_at: None,
        is_deleted: false,
        is_pinned: false,
        metadata: None,
    });
    
    Ok(())
}

#[reducer]
pub fn remove_group_member(ctx: &ReducerContext, conversation_id: u64, user_identity: Identity) -> Result<(), String> {
    let conversation = ctx.db.conversation().conversation_id().find(conversation_id)
        .ok_or("Conversation not found")?;
    
    if conversation.conversation_type != "group" {
        return Err("Can only remove members from group conversations".to_string());
    }
    
    let role = get_participant_role(ctx, conversation_id, ctx.sender)
        .ok_or("You are not a member of this conversation")?;
    
    if role != "owner" && role != "admin" {
        return Err("Only owners and admins can remove members".to_string());
    }
    
    let target_role = get_participant_role(ctx, conversation_id, user_identity)
        .ok_or("User is not a member")?;
    
    if target_role == "owner" {
        return Err("Cannot remove the owner".to_string());
    }
    
    if role == "admin" && target_role == "admin" {
        return Err("Admins cannot remove other admins".to_string());
    }
    
    // Find and delete participant
    let participant = ctx.db.conversation_participant()
        .iter()
        .find(|p| p.conversation_id == conversation_id && p.user_identity == user_identity);
    
    if let Some(p) = participant {
        ctx.db.conversation_participant().participant_id().delete(p.participant_id);
    }
    
    // System message
    let remover = ctx.db.user().identity().find(ctx.sender).map(|u| u.username).unwrap_or_default();
    let removed = ctx.db.user().identity().find(user_identity).map(|u| u.username).unwrap_or_default();
    
    ctx.db.message().insert(Message {
        message_id: 0,
        conversation_id,
        sender_identity: ctx.sender,
        content: format!("{} removed {} from the group", remover, removed),
        message_type: "system".to_string(),
        reply_to_message_id: None,
        thread_root_id: None,
        sent_at: ctx.timestamp,
        edited_at: None,
        is_deleted: false,
        is_pinned: false,
        metadata: None,
    });
    
    Ok(())
}

#[reducer]
pub fn leave_conversation(ctx: &ReducerContext, conversation_id: u64) -> Result<(), String> {
    let participant = ctx.db.conversation_participant()
        .iter()
        .find(|p| p.conversation_id == conversation_id && p.user_identity == ctx.sender)
        .ok_or("You are not a member of this conversation")?;
    
    let conversation = ctx.db.conversation().conversation_id().find(conversation_id)
        .ok_or("Conversation not found")?;
    
    if conversation.conversation_type == "group" && participant.role == "owner" {
        // Transfer ownership to another admin or member
        let new_owner = ctx.db.conversation_participant()
            .iter()
            .filter(|p| p.conversation_id == conversation_id && p.user_identity != ctx.sender)
            .max_by_key(|p| if p.role == "admin" { 1 } else { 0 });
        
        if let Some(no) = new_owner {
            ctx.db.conversation_participant().participant_id().update(ConversationParticipant {
                role: "owner".to_string(),
                ..no
            });
        }
    }
    
    ctx.db.conversation_participant().participant_id().delete(participant.participant_id);
    
    // System message for groups
    if conversation.conversation_type == "group" {
        let leaver = ctx.db.user().identity().find(ctx.sender).map(|u| u.username).unwrap_or_default();
        ctx.db.message().insert(Message {
            message_id: 0,
            conversation_id,
            sender_identity: ctx.sender,
            content: format!("{} left the group", leaver),
            message_type: "system".to_string(),
            reply_to_message_id: None,
            thread_root_id: None,
            sent_at: ctx.timestamp,
            edited_at: None,
            is_deleted: false,
            is_pinned: false,
            metadata: None,
        });
    }
    
    Ok(())
}

#[reducer]
pub fn mute_conversation(ctx: &ReducerContext, conversation_id: u64, mute_until: Option<Timestamp>) -> Result<(), String> {
    let participant = ctx.db.conversation_participant()
        .iter()
        .find(|p| p.conversation_id == conversation_id && p.user_identity == ctx.sender)
        .ok_or("You are not a member of this conversation")?;
    
    ctx.db.conversation_participant().participant_id().update(ConversationParticipant {
        is_muted: true,
        muted_until: mute_until,
        ..participant
    });
    
    Ok(())
}

#[reducer]
pub fn unmute_conversation(ctx: &ReducerContext, conversation_id: u64) -> Result<(), String> {
    let participant = ctx.db.conversation_participant()
        .iter()
        .find(|p| p.conversation_id == conversation_id && p.user_identity == ctx.sender)
        .ok_or("You are not a member of this conversation")?;
    
    ctx.db.conversation_participant().participant_id().update(ConversationParticipant {
        is_muted: false,
        muted_until: None,
        ..participant
    });
    
    Ok(())
}

#[reducer]
pub fn archive_conversation(ctx: &ReducerContext, conversation_id: u64) -> Result<(), String> {
    let participant = ctx.db.conversation_participant()
        .iter()
        .find(|p| p.conversation_id == conversation_id && p.user_identity == ctx.sender)
        .ok_or("You are not a member of this conversation")?;
    
    ctx.db.conversation_participant().participant_id().update(ConversationParticipant {
        is_archived: true,
        ..participant
    });
    
    Ok(())
}

#[reducer]
pub fn unarchive_conversation(ctx: &ReducerContext, conversation_id: u64) -> Result<(), String> {
    let participant = ctx.db.conversation_participant()
        .iter()
        .find(|p| p.conversation_id == conversation_id && p.user_identity == ctx.sender)
        .ok_or("You are not a member of this conversation")?;
    
    ctx.db.conversation_participant().participant_id().update(ConversationParticipant {
        is_archived: false,
        ..participant
    });
    
    Ok(())
}


#[reducer]
pub fn send_message(
    ctx: &ReducerContext,
    conversation_id: u64,
    content: String,
    message_type: Option<String>,
    reply_to_message_id: Option<u64>,
) -> Result<(), String> {
    validate_message(&content)?;
    
    if !is_participant(ctx, conversation_id, ctx.sender) {
        return Err("You are not a member of this conversation".to_string());
    }
    
    let msg_type = message_type.unwrap_or_else(|| "text".to_string());
    
    // Validate reply target exists in same conversation
    if let Some(reply_id) = reply_to_message_id {
        let reply_msg = ctx.db.message().message_id().find(reply_id)
            .ok_or("Reply target message not found")?;
        if reply_msg.conversation_id != conversation_id {
            return Err("Cannot reply to messages in other conversations".to_string());
        }
    }
    
    // Parse mentions from content - look for @username patterns
    let mentioned_users: Vec<Identity> = ctx.db.user()
        .iter()
        .filter(|u| content.to_lowercase().contains(&format!("@{}", u.username.to_lowercase())))
        .map(|u| u.identity)
        .collect();
    
    let message = ctx.db.message().insert(Message {
        message_id: 0,
        conversation_id,
        sender_identity: ctx.sender,
        content: content.clone(),
        message_type: msg_type,
        reply_to_message_id,
        thread_root_id: None,
        sent_at: ctx.timestamp,
        edited_at: None,
        is_deleted: false,
        is_pinned: false,
        metadata: None,
    });
    
    // Create notifications for mentioned users
    let sender = ctx.db.user().identity().find(ctx.sender);
    let sender_name = sender.map(|u| u.display_name.unwrap_or(u.username)).unwrap_or_default();
    
    for mentioned_identity in mentioned_users {
        if mentioned_identity != ctx.sender {
            ctx.db.notification().insert(Notification {
                notification_id: 0,
                user_identity: mentioned_identity,
                notification_type: "mention".to_string(),
                title: format!("{} mentioned you", sender_name),
                body: if content.len() > 100 { format!("{}...", &content[..100]) } else { content.clone() },
                data: Some(format!(r#"{{"conversationId":{},"messageId":{}}}"#, conversation_id, message.message_id)),
                is_read: false,
                created_at: ctx.timestamp,
            });
        }
    }
    
    // Update conversation timestamp
    if let Some(conversation) = ctx.db.conversation().conversation_id().find(conversation_id) {
        ctx.db.conversation().conversation_id().update(Conversation {
            updated_at: ctx.timestamp,
            ..conversation
        });
    }
    
    // Clear typing indicator
    let typing_to_remove: Vec<u64> = ctx.db.typing_indicator()
        .iter()
        .filter(|t| t.conversation_id == conversation_id && t.user_identity == ctx.sender)
        .map(|t| t.typing_id)
        .collect();
    
    for typing_id in typing_to_remove {
        if let Some(_typing) = ctx.db.typing_indicator().typing_id().find(typing_id) {
            ctx.db.typing_indicator().typing_id().delete(typing_id);
        }
    }
    
    Ok(())
}

/// Send a message with file attachment (image, file, etc.)
#[reducer]
pub fn send_message_with_attachment(
    ctx: &ReducerContext,
    conversation_id: u64,
    content: String,
    file_name: String,
    file_type: String,
    file_size: u64,
    file_url: String,
    thumbnail_url: Option<String>,
) -> Result<(), String> {
    if !is_participant(ctx, conversation_id, ctx.sender) {
        return Err("You are not a member of this conversation".to_string());
    }
    
    // Validate file size (max 50MB)
    if file_size > 50 * 1024 * 1024 {
        return Err("File size exceeds 50MB limit".to_string());
    }
    
    // Determine message type from file type
    let msg_type = if file_type.starts_with("image/") {
        "image"
    } else if file_type.starts_with("video/") {
        "video"
    } else {
        "file"
    }.to_string();
    
    // Create message
    let message = ctx.db.message().insert(Message {
        message_id: 0,
        conversation_id,
        sender_identity: ctx.sender,
        content: if content.is_empty() { file_name.clone() } else { content },
        message_type: msg_type,
        reply_to_message_id: None,
        thread_root_id: None,
        sent_at: ctx.timestamp,
        edited_at: None,
        is_deleted: false,
        is_pinned: false,
        metadata: Some(format!(r#"{{"fileName":"{}","fileSize":{}}}"#, file_name, file_size)),
    });
    
    // Create attachment record
    ctx.db.file_attachment().insert(FileAttachment {
        attachment_id: 0,
        message_id: message.message_id,
        file_name,
        file_type,
        file_size,
        file_url,
        thumbnail_url,
        uploaded_at: ctx.timestamp,
    });
    
    // Update conversation timestamp
    if let Some(conversation) = ctx.db.conversation().conversation_id().find(conversation_id) {
        ctx.db.conversation().conversation_id().update(Conversation {
            updated_at: ctx.timestamp,
            ..conversation
        });
    }
    
    // Clear typing indicator
    let typing_to_remove: Vec<u64> = ctx.db.typing_indicator()
        .iter()
        .filter(|t| t.conversation_id == conversation_id && t.user_identity == ctx.sender)
        .map(|t| t.typing_id)
        .collect();
    
    for typing_id in typing_to_remove {
        if let Some(_typing) = ctx.db.typing_indicator().typing_id().find(typing_id) {
            ctx.db.typing_indicator().typing_id().delete(typing_id);
        }
    }
    
    Ok(())
}

#[reducer]
pub fn edit_message(ctx: &ReducerContext, message_id: u64, new_content: String) -> Result<(), String> {
    validate_message(&new_content)?;
    
    let message = ctx.db.message().message_id().find(message_id)
        .ok_or("Message not found")?;
    
    if message.sender_identity != ctx.sender {
        return Err("You can only edit your own messages".to_string());
    }
    
    if message.is_deleted {
        return Err("Cannot edit deleted messages".to_string());
    }
    
    if message.message_type == "system" {
        return Err("Cannot edit system messages".to_string());
    }
    
    ctx.db.message().message_id().update(Message {
        content: new_content,
        edited_at: Some(ctx.timestamp),
        ..message
    });
    
    Ok(())
}

#[reducer]
pub fn delete_message(ctx: &ReducerContext, message_id: u64) -> Result<(), String> {
    let message = ctx.db.message().message_id().find(message_id)
        .ok_or("Message not found")?;
    
    // Allow sender or admins/owners to delete
    let can_delete = message.sender_identity == ctx.sender || {
        let role = get_participant_role(ctx, message.conversation_id, ctx.sender);
        role == Some("owner".to_string()) || role == Some("admin".to_string())
    };
    
    if !can_delete {
        return Err("You don't have permission to delete this message".to_string());
    }
    
    ctx.db.message().message_id().update(Message {
        is_deleted: true,
        content: "[Message deleted]".to_string(),
        edited_at: Some(ctx.timestamp),
        ..message
    });
    
    Ok(())
}

#[reducer]
pub fn pin_message(ctx: &ReducerContext, message_id: u64) -> Result<(), String> {
    let message = ctx.db.message().message_id().find(message_id)
        .ok_or("Message not found")?;
    
    let role = get_participant_role(ctx, message.conversation_id, ctx.sender)
        .ok_or("You are not a member of this conversation")?;
    
    if role != "owner" && role != "admin" {
        return Err("Only owners and admins can pin messages".to_string());
    }
    
    ctx.db.message().message_id().update(Message {
        is_pinned: true,
        ..message
    });
    
    Ok(())
}

#[reducer]
pub fn unpin_message(ctx: &ReducerContext, message_id: u64) -> Result<(), String> {
    let message = ctx.db.message().message_id().find(message_id)
        .ok_or("Message not found")?;
    
    let role = get_participant_role(ctx, message.conversation_id, ctx.sender)
        .ok_or("You are not a member of this conversation")?;
    
    if role != "owner" && role != "admin" {
        return Err("Only owners and admins can unpin messages".to_string());
    }
    
    ctx.db.message().message_id().update(Message {
        is_pinned: false,
        ..message
    });
    
    Ok(())
}


#[reducer]
pub fn add_reaction(ctx: &ReducerContext, message_id: u64, emoji: String) -> Result<(), String> {
    if emoji.is_empty() {
        return Err("Emoji cannot be empty".to_string());
    }
    
    let message = ctx.db.message().message_id().find(message_id)
        .ok_or("Message not found")?;
    
    if !is_participant(ctx, message.conversation_id, ctx.sender) {
        return Err("You are not a member of this conversation".to_string());
    }
    
    let existing_reaction = ctx.db.message_reaction()
        .iter()
        .find(|r| r.message_id == message_id && r.user_identity == ctx.sender);

    if let Some(existing) = existing_reaction {
        if existing.emoji == emoji {
            ctx.db.message_reaction().reaction_id().delete(existing.reaction_id);
            return Ok(());
        }

        ctx.db.message_reaction().reaction_id().update(MessageReaction {
            emoji,
            created_at: ctx.timestamp,
            ..existing
        });
        return Ok(());
    }

    ctx.db.message_reaction().insert(MessageReaction {
        reaction_id: 0,
        message_id,
        user_identity: ctx.sender,
        emoji,
        created_at: ctx.timestamp,
    });
    
    Ok(())
}

#[reducer]
pub fn remove_reaction(ctx: &ReducerContext, message_id: u64, emoji: String) -> Result<(), String> {
    let reaction = ctx.db.message_reaction()
        .iter()
        .find(|r| r.message_id == message_id && r.user_identity == ctx.sender && r.emoji == emoji)
        .ok_or("Reaction not found")?;
    
    ctx.db.message_reaction().reaction_id().delete(reaction.reaction_id);
    
    Ok(())
}


#[reducer]
pub fn mark_as_read(ctx: &ReducerContext, conversation_id: u64, message_id: u64) -> Result<(), String> {
    if !is_participant(ctx, conversation_id, ctx.sender) {
        return Err("You are not a member of this conversation".to_string());
    }
    
    let message = ctx.db.message().message_id().find(message_id)
        .ok_or("Message not found")?;
    
    if message.conversation_id != conversation_id {
        return Err("Message not in this conversation".to_string());
    }
    
    // Check if already read
    let existing = ctx.db.read_receipt()
        .iter()
        .any(|r| r.message_id == message_id && r.user_identity == ctx.sender);
    
    if !existing {
        ctx.db.read_receipt().insert(ReadReceipt {
            receipt_id: 0,
            message_id,
            user_identity: ctx.sender,
            read_at: ctx.timestamp,
        });
    }
    
    // Update participant's last read message
    let participant = ctx.db.conversation_participant()
        .iter()
        .find(|p| p.conversation_id == conversation_id && p.user_identity == ctx.sender);
    
    if let Some(p) = participant {
        ctx.db.conversation_participant().participant_id().update(ConversationParticipant {
            last_read_message_id: Some(message_id),
            ..p
        });
    }
    
    Ok(())
}


#[reducer]
pub fn start_typing(ctx: &ReducerContext, conversation_id: u64) -> Result<(), String> {
    if !is_participant(ctx, conversation_id, ctx.sender) {
        return Err("You are not a member of this conversation".to_string());
    }
    
    // Remove existing typing indicator
    let existing: Vec<u64> = ctx.db.typing_indicator()
        .iter()
        .filter(|t| t.conversation_id == conversation_id && t.user_identity == ctx.sender)
        .map(|t| t.typing_id)
        .collect();
    
    for typing_id in existing {
        if let Some(_typing) = ctx.db.typing_indicator().typing_id().find(typing_id) {
            ctx.db.typing_indicator().typing_id().delete(typing_id);
        }
    }
    
    ctx.db.typing_indicator().insert(TypingIndicator {
        typing_id: 0,
        conversation_id,
        user_identity: ctx.sender,
        started_at: ctx.timestamp,
    });
    
    Ok(())
}

#[reducer]
pub fn stop_typing(ctx: &ReducerContext, conversation_id: u64) -> Result<(), String> {
    let typing_to_remove: Vec<u64> = ctx.db.typing_indicator()
        .iter()
        .filter(|t| t.conversation_id == conversation_id && t.user_identity == ctx.sender)
        .map(|t| t.typing_id)
        .collect();
    
    for typing_id in typing_to_remove {
        if let Some(_typing) = ctx.db.typing_indicator().typing_id().find(typing_id) {
            ctx.db.typing_indicator().typing_id().delete(typing_id);
        }
    }
    
    Ok(())
}


#[reducer]
pub fn add_attachment(
    ctx: &ReducerContext,
    message_id: u64,
    file_name: String,
    file_type: String,
    file_size: u64,
    file_url: String,
    thumbnail_url: Option<String>,
) -> Result<(), String> {
    let message = ctx.db.message().message_id().find(message_id)
        .ok_or("Message not found")?;
    
    if message.sender_identity != ctx.sender {
        return Err("You can only add attachments to your own messages".to_string());
    }
    
    // Validate file size (max 50MB)
    if file_size > 50 * 1024 * 1024 {
        return Err("File size exceeds 50MB limit".to_string());
    }
    
    ctx.db.file_attachment().insert(FileAttachment {
        attachment_id: 0,
        message_id,
        file_name,
        file_type,
        file_size,
        file_url,
        thumbnail_url,
        uploaded_at: ctx.timestamp,
    });
    
    Ok(())
}

#[reducer]
pub fn create_notification(
    ctx: &ReducerContext,
    user_identity: Identity,
    notification_type: String,
    title: String,
    body: String,
    data: Option<String>,
) -> Result<(), String> {
    ctx.db.notification().insert(Notification {
        notification_id: 0,
        user_identity,
        notification_type,
        title,
        body,
        data,
        is_read: false,
        created_at: ctx.timestamp,
    });
    
    Ok(())
}

#[reducer]
pub fn mark_notification_read(ctx: &ReducerContext, notification_id: u64) -> Result<(), String> {
    let notification = ctx.db.notification().notification_id().find(notification_id)
        .ok_or("Notification not found")?;
    
    if notification.user_identity != ctx.sender {
        return Err("You can only mark your own notifications as read".to_string());
    }
    
    ctx.db.notification().notification_id().update(Notification {
        is_read: true,
        ..notification
    });
    
    Ok(())
}

#[reducer]
pub fn mark_all_notifications_read(ctx: &ReducerContext) -> Result<(), String> {
    let notifications: Vec<u64> = ctx.db.notification()
        .iter()
        .filter(|n| n.user_identity == ctx.sender && !n.is_read)
        .map(|n| n.notification_id)
        .collect();
    
    for notification_id in notifications {
        if let Some(n) = ctx.db.notification().notification_id().find(notification_id) {
            ctx.db.notification().notification_id().update(Notification {
                is_read: true,
                ..n
            });
        }
    }
    
    Ok(())
}

#[reducer]
pub fn delete_notification(ctx: &ReducerContext, notification_id: u64) -> Result<(), String> {
    let notification = ctx.db.notification().notification_id().find(notification_id)
        .ok_or("Notification not found")?;
    
    if notification.user_identity != ctx.sender {
        return Err("You can only delete your own notifications".to_string());
    }
    
    ctx.db.notification().notification_id().delete(notification.notification_id);
    
    Ok(())
}


#[reducer]
pub fn promote_to_admin(ctx: &ReducerContext, conversation_id: u64, user_identity: Identity) -> Result<(), String> {
    let role = get_participant_role(ctx, conversation_id, ctx.sender)
        .ok_or("You are not a member of this conversation")?;
    
    if role != "owner" {
        return Err("Only the owner can promote members to admin".to_string());
    }
    
    let participant = ctx.db.conversation_participant()
        .iter()
        .find(|p| p.conversation_id == conversation_id && p.user_identity == user_identity)
        .ok_or("User is not a member of this conversation")?;
    
    ctx.db.conversation_participant().participant_id().update(ConversationParticipant {
        role: "admin".to_string(),
        ..participant
    });
    
    Ok(())
}

#[reducer]
pub fn demote_from_admin(ctx: &ReducerContext, conversation_id: u64, user_identity: Identity) -> Result<(), String> {
    let role = get_participant_role(ctx, conversation_id, ctx.sender)
        .ok_or("You are not a member of this conversation")?;
    
    if role != "owner" {
        return Err("Only the owner can demote admins".to_string());
    }
    
    let participant = ctx.db.conversation_participant()
        .iter()
        .find(|p| p.conversation_id == conversation_id && p.user_identity == user_identity)
        .ok_or("User is not a member of this conversation")?;
    
    if participant.role != "admin" {
        return Err("User is not an admin".to_string());
    }
    
    ctx.db.conversation_participant().participant_id().update(ConversationParticipant {
        role: "member".to_string(),
        ..participant
    });
    
    Ok(())
}

#[reducer]
pub fn transfer_ownership(ctx: &ReducerContext, conversation_id: u64, new_owner_identity: Identity) -> Result<(), String> {
    let role = get_participant_role(ctx, conversation_id, ctx.sender)
        .ok_or("You are not a member of this conversation")?;
    
    if role != "owner" {
        return Err("Only the owner can transfer ownership".to_string());
    }
    
    let new_owner_participant = ctx.db.conversation_participant()
        .iter()
        .find(|p| p.conversation_id == conversation_id && p.user_identity == new_owner_identity)
        .ok_or("New owner is not a member of this conversation")?;
    
    let current_owner = ctx.db.conversation_participant()
        .iter()
        .find(|p| p.conversation_id == conversation_id && p.user_identity == ctx.sender)
        .ok_or("Current owner not found")?;
    
    // Demote current owner to admin
    ctx.db.conversation_participant().participant_id().update(ConversationParticipant {
        role: "admin".to_string(),
        ..current_owner
    });
    
    // Promote new owner
    ctx.db.conversation_participant().participant_id().update(ConversationParticipant {
        role: "owner".to_string(),
        ..new_owner_participant
    });
    
    Ok(())
}
