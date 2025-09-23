// Global variables
let googleUser = null;
let gmailService = null;
let socket = null;

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Networking Hub initialized');
    
    // Initialize Google Sign-In
    initializeGoogleSignIn();
    
    // Initialize WebSocket connection
    initializeWebSocket();
    
    // Set up event listeners
    setupEventListeners();
    
    // Check if user is already logged in
    checkLoginStatus();
    
    
    // Show fallback sign-in after 3 seconds if Google Sign-In hasn't loaded
    setTimeout(() => {
        const googleButton = document.querySelector('.g_id_signin iframe');
        const fallbackButton = document.getElementById('fallbackSignIn');
        
        if (!googleButton && fallbackButton && fallbackButton.style.display === 'none') {
            console.log('⏰ Google Sign-In timeout, showing fallback');
            showFallbackSignIn();
        }
    }, 3000);
});

// Initialize WebSocket connection
function initializeWebSocket() {
    console.log('🔌 Initializing WebSocket connection...');
    
    socket = io();
    
    socket.on('connect', () => {
        console.log('✅ Connected to server via WebSocket');
    });
    
    socket.on('disconnect', () => {
        console.log('❌ Disconnected from server');
    });
    
    socket.on('new_emails', (data) => {
        console.log('📬 Received new emails notification:', data);
        console.log('📬 Current user:', googleUser ? googleUser.sub : 'No user');
        console.log('📬 Data userId:', data.userId);
        
        if (data.userId && googleUser && googleUser.sub === data.userId) {
            console.log('📬 ✅ Processing new emails for current user');
            showMessage(`📬 ${data.count} new emails received!`, 'success');
            
            // Always refresh emails and contacts when new emails arrive
            loadUserEmails();
            loadUserContacts();
            
            // Update the email count in the UI
            updateEmailCount(data.count);
        } else {
            console.log('📬 ❌ Ignoring new emails notification - user mismatch or no user');
            console.log('📬 Expected:', googleUser ? googleUser.sub : 'No user');
            console.log('📬 Received:', data.userId);
        }
    });
}

// Initialize Google Sign-In
function initializeGoogleSignIn() {
    // Load Google Sign-In configuration from server
    fetch('/api/config')
        .then(response => response.json())
        .then(config => {
            if (config.googleClientId) {
                // Initialize Google Sign-In with the client ID and Gmail scope
                google.accounts.id.initialize({
                    client_id: config.googleClientId,
                    callback: handleCredentialResponse,
                    auto_select: false,
                    cancel_on_tap_outside: false
                });
                
                // Render the sign-in button
                const signInButton = document.getElementById('googleSignInButton');
                if (signInButton) {
                    google.accounts.id.renderButton(signInButton, {
                        theme: 'outline',
                        size: 'large',
                        text: 'signin_with',
                        shape: 'rectangular'
                    });
                    console.log('✅ Google Sign-In button rendered');
                } else {
                    console.error('❌ Google Sign-In button element not found');
                    showFallbackSignIn();
                }
            } else {
                console.error('Google Client ID not configured');
                showFallbackSignIn();
            }
        })
        .catch(error => {
            console.error('Error loading configuration:', error);
            showFallbackSignIn();
        });
}

// Show fallback sign-in button
function showFallbackSignIn() {
    console.log('🔄 Showing fallback sign-in button');
    const fallbackButton = document.getElementById('fallbackSignIn');
    if (fallbackButton) {
        fallbackButton.style.display = 'block';
    }
}

// Handle fallback sign-in
function handleFallbackSignIn() {
    showMessage('Google Sign-In is not configured. Please check your server settings.', 'error');
    console.log('Fallback sign-in clicked - Google Sign-In not available');
}

// Request Gmail API access using OAuth 2.0
function requestGmailAccess() {
    console.log('📧 Requesting Gmail API access...');
    
    // Get client ID from server config
    fetch('/api/config')
        .then(response => response.json())
        .then(config => {
            console.log('🔧 Config received:', config);
            if (config.googleClientId && config.googleClientId !== 'YOUR_GOOGLE_CLIENT_ID') {
                const clientId = config.googleClientId;
                const redirectUri = window.location.origin + '/oauth/callback';
                const scope = 'https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/pubsub';
                
                console.log('🔑 Using client ID:', clientId);
                console.log('🌐 Redirect URI:', redirectUri);
                
                // Use Google Sign-In JavaScript library for Gmail access
                const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
                    `client_id=${encodeURIComponent(clientId)}&` +
                    `redirect_uri=${encodeURIComponent(redirectUri)}&` +
                    `scope=${encodeURIComponent(scope)}&` +
                    `response_type=code&` +
                    `access_type=offline&` +
                    `prompt=consent`;
                
                console.log('🔗 OAuth URL:', authUrl);
                
                // Test the URL by logging each parameter
                const urlParams = new URLSearchParams(authUrl.split('?')[1]);
                console.log('📋 URL Parameters:');
                console.log('  client_id:', urlParams.get('client_id'));
                console.log('  redirect_uri:', urlParams.get('redirect_uri'));
                console.log('  scope:', urlParams.get('scope'));
                console.log('  response_type:', urlParams.get('response_type'));
                
                // For debugging, let's redirect to the OAuth URL instead of using popup
                console.log('🔄 Redirecting to OAuth URL for Gmail access...');
                window.location.href = authUrl;
            } else {
                console.error('❌ Google Client ID not configured properly');
                showMessage('Google Client ID not configured. Please check server settings.', 'error');
            }
        })
        .catch(error => {
            console.error('Error getting config:', error);
            showMessage('Error requesting Gmail access. Please try again.', 'error');
        });
}

// Handle Google Sign-In response
function handleCredentialResponse(response) {
    console.log('🔐 Google Sign-In response received');
    
    try {
        // Decode the JWT token
        const payload = JSON.parse(atob(response.credential.split('.')[1]));
        
        googleUser = {
            sub: payload.sub,
            name: payload.name,
            email: payload.email,
            picture: payload.picture
        };
        
        console.log('👤 User signed in:', googleUser.name, googleUser.email);
        
        // Save user data to localStorage
        localStorage.setItem('googleUser', JSON.stringify(googleUser));
        
        // Update UI
        showUserInfo();
        
        // Save user to database
        saveUserToDatabase();
        
        // Request Gmail access after successful sign-in
        requestGmailAccess();
        
        // Load user data
        loadUserData();
        
    } catch (error) {
        console.error('Error processing Google Sign-In response:', error);
        showMessage('Sign-in failed. Please try again.', 'error');
    }
}

// Set up event listeners
function setupEventListeners() {
    // Navigation tabs
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            const tab = this.dataset.tab;
            switchTab(tab);
        });
    });
    
    // Connect Gmail button
    const connectGmailBtn = document.getElementById('connectGmailBtn');
    if (connectGmailBtn) {
        connectGmailBtn.addEventListener('click', function() {
            if (googleUser) {
                connectGmail();
            } else {
                showMessage('Please sign in first', 'error');
            }
        });
    }

    // Refresh Emails button
    const refreshEmailsBtn = document.getElementById('refreshEmailsBtn');
    if (refreshEmailsBtn) {
        refreshEmailsBtn.addEventListener('click', function() {
            if (googleUser) {
                refreshEmails();
            } else {
                showMessage('Please sign in first', 'error');
            }
        });
    }

    // Clear Tokens button
    const clearTokensBtn = document.getElementById('clearTokensBtn');
    if (clearTokensBtn) {
        clearTokensBtn.addEventListener('click', function() {
            clearGmailTokens();
        });
    }
    
    // Analyze conversations button
    const analyzeConversationsBtn = document.getElementById('analyzeConversationsBtn');
    if (analyzeConversationsBtn) {
        analyzeConversationsBtn.addEventListener('click', function() {
            if (googleUser) {
                analyzeConversations();
            } else {
                showMessage('Please sign in first', 'error');
            }
        });
    }
    
    // Theme toggle
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', function() {
            toggleTheme();
        });
    }
    
    // Settings button
    const settingsBtn = document.getElementById('settingsBtn');
    if (settingsBtn) {
        settingsBtn.addEventListener('click', function() {
            switchTab('settings');
        });
    }
    
    // User menu button (three dots)
    const userMenuBtn = document.querySelector('.user-menu-btn');
    if (userMenuBtn) {
        userMenuBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            toggleUserMenu();
        });
    }
    
    // Close user menu when clicking outside
    document.addEventListener('click', function(e) {
        const userMenu = document.getElementById('userMenu');
        const userProfile = document.querySelector('.user-profile');
        
        if (userMenu && !userProfile.contains(e.target)) {
            closeUserMenu();
        }
    });
}

// Switch between tabs
function switchTab(tabName) {
    console.log(`🔄 Switching to tab: ${tabName}`);
    
    // Remove active class from all nav items
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => item.classList.remove('active'));
    
    // Add active class to clicked nav item (only if it exists)
    const activeNavItem = document.querySelector(`[data-tab="${tabName}"]`);
    if (activeNavItem) {
        activeNavItem.classList.add('active');
        console.log(`✅ Nav item for ${tabName} activated`);
    } else {
        console.log(`⚠️ No nav item found for ${tabName}`);
    }
    
    // Hide all content sections
    const contentSections = document.querySelectorAll('.content-section');
    contentSections.forEach(section => section.classList.remove('active'));
    console.log(`📦 Hidden ${contentSections.length} content sections`);
    
    // Show selected content section
    const activeSection = document.getElementById(`${tabName}Section`);
    if (activeSection) {
        activeSection.classList.add('active');
        console.log(`✅ Section ${tabName}Section activated`);
    } else {
        console.error(`❌ Section ${tabName}Section not found`);
    }
    
    // Load data for the active tab (only if user is logged in)
    if (googleUser && tabName !== 'sign-in') {
        switch(tabName) {
            case 'emails':
                loadUserEmails();
                break;
            case 'contacts':
                loadUserContacts();
                break;
            case 'follow-ups':
                loadUserFollowUps();
                break;
        }
    }
}

// Check if user is already logged in
function checkLoginStatus() {
    const savedUser = localStorage.getItem('googleUser');
    if (savedUser) {
        try {
            googleUser = JSON.parse(savedUser);
            console.log('👤 User already logged in:', googleUser.name);
            showUserInfo();
            loadUserData();
            
            // Check if Gmail tokens are available and auto-connect
            const gmailAccessToken = localStorage.getItem('gmailAccessToken');
            if (gmailAccessToken) {
                console.log('🔑 Gmail tokens found, saving to database and auto-connecting...');
                // Save Gmail tokens to database first
                saveUserToDatabase();
                // Auto-connect Gmail if tokens are available
                setTimeout(() => {
                    connectGmail();
                }, 1000);
            }
        } catch (error) {
            console.error('Error parsing saved user data:', error);
            localStorage.removeItem('googleUser');
            showSignInPrompt();
        }
    } else {
        console.log('👤 No user found, showing sign-in prompt');
        showSignInPrompt();
    }
}

// Show user info in sidebar
function showUserInfo() {
    if (googleUser) {
        const userAvatar = document.getElementById('userAvatar');
        const userInfo = document.getElementById('userInfo');
        
        if (userAvatar) {
            userAvatar.innerHTML = `<img src="${googleUser.picture}" alt="${googleUser.name}" style="width: 100%; height: 100%; border-radius: 8px; object-fit: cover;">`;
        }
        
        if (userInfo) {
            const userName = userInfo.querySelector('.user-name');
            if (userName) {
                userName.textContent = googleUser.name;
            }
        }
        
        // Hide sign-in section and show emails section
        const signInSection = document.getElementById('signInSection');
        const emailsSection = document.getElementById('emailsSection');
        
        if (signInSection) {
            signInSection.classList.remove('active');
        }
        if (emailsSection) {
            emailsSection.classList.add('active');
        }
        
        // Update navigation
        const navItems = document.querySelectorAll('.nav-item');
        navItems.forEach(item => item.classList.remove('active'));
        const emailsNav = document.querySelector('[data-tab="emails"]');
        if (emailsNav) {
            emailsNav.classList.add('active');
        }
        
        // Join user's WebSocket room for real-time updates
        if (socket && googleUser.sub) {
            socket.emit('join_user', googleUser.sub);
            console.log(`🔌 Joined WebSocket room for user: ${googleUser.sub}`);
        }
    }
}

// Show sign-in prompt
function showSignInPrompt() {
    console.log('🔐 Showing sign-in prompt');
    
    // Switch to sign-in section
    switchTab('signIn');
    
    // Show the Google Sign-In button
    const signInButton = document.getElementById('googleSignInButton');
    if (signInButton) {
        signInButton.style.display = 'block';
        console.log('✅ Sign-in button element found and shown');
    } else {
        console.error('❌ Sign-in button element not found');
    }
    
    // Force show fallback button for testing
    console.log('🔄 Force showing fallback sign-in button for testing');
    showFallbackSignIn();
}

// Save user to database
async function saveUserToDatabase() {
    if (!googleUser) return;
    
    try {
        // Get Gmail tokens from localStorage
        const gmailAccessToken = localStorage.getItem('gmailAccessToken');
        const gmailRefreshToken = localStorage.getItem('gmailRefreshToken');
        const gmailTokenExpires = localStorage.getItem('gmailTokenExpires');
        
        const response = await fetch('/api/save-user', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                google_id: googleUser.sub,
                name: googleUser.name,
                email: googleUser.email,
                picture: googleUser.picture,
                gmail_access_token: gmailAccessToken,
                gmail_refresh_token: gmailRefreshToken,
                token_expires_at: gmailTokenExpires
            })
        });
        
        const result = await response.json();
        if (result.success) {
            console.log('✅ User saved to database');
        } else {
            console.error('Error saving user:', result.error);
        }
    } catch (error) {
        console.error('Error saving user:', error);
    }
}

// Load user data
async function loadUserData() {
    if (!googleUser) return;
    
    // Load emails, contacts, and follow-ups from database
    await Promise.all([
        loadUserEmails(),
        loadUserContacts(),
        loadUserFollowUps()
    ]);
    
    // Also fetch fresh emails from Gmail if tokens are available
    const gmailAccessToken = localStorage.getItem('gmailAccessToken');
    if (gmailAccessToken) {
        console.log('🔄 Auto-fetching fresh emails from Gmail...');
        try {
            const gmailRefreshToken = localStorage.getItem('gmailRefreshToken');
            
            const response = await fetch('/api/sync-emails', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    google_id: googleUser.sub,
                    access_token: gmailAccessToken,
                    refresh_token: gmailRefreshToken
                })
            });
            
            const result = await response.json();
            
            if (result.success) {
                console.log(`✅ Auto-fetched ${result.count} fresh emails from Gmail`);
                
                // Reload emails and contacts with fresh data
                loadUserEmails();
                loadUserContacts();
            } else {
                console.log('⚠️ Auto-fetch failed:', result.error);
            }
        } catch (error) {
            console.error('❌ Error auto-fetching emails:', error);
        }
    }
}

// Load user emails from database
async function loadUserEmails() {
    if (!googleUser) return;
    
    try {
        const response = await fetch(`/api/emails/${googleUser.sub}`);
        const result = await response.json();
        
        if (result.success) {
            if (result.emails && result.emails.length > 0) {
                displayEmails(result.emails);
            } else {
                showEmptyState('emailsContainer', 'No emails yet', 'Sign in and sync your emails to get started');
            }
        } else {
            showEmptyState('emailsContainer', 'No emails yet', 'Sign in and sync your emails to get started');
        }
    } catch (error) {
        console.error('Error loading emails:', error);
        showMessage('Error loading emails. Please try again.', 'error');
    }
}

// Display emails grouped by conversation
function displayEmails(emails) {
    const container = document.getElementById('emailsContainer');
    if (!container) return;
    
    // Group emails by sender (conversation)
    const conversations = groupEmailsByConversation(emails);
    
    const conversationsHTML = conversations.map(conversation => `
        <div class="conversation-card" onclick="toggleConversation('${conversation.sender}')">
            <div class="conversation-header">
                <div class="conversation-avatar">
                    ${conversation.sender.charAt(0).toUpperCase()}
                </div>
                <div class="conversation-info">
                    <div class="conversation-sender">${conversation.sender}</div>
                    <div class="conversation-count">${conversation.emails.length} email${conversation.emails.length > 1 ? 's' : ''}</div>
                </div>
                <div class="conversation-meta">
                    <div class="conversation-date">${formatDate(conversation.latestEmail.date_sent)}</div>
                    <div class="conversation-toggle">
                        <i class="fas fa-chevron-down"></i>
                    </div>
                </div>
            </div>
            <div class="conversation-preview">
                <div class="conversation-subject">${conversation.latestEmail.subject}</div>
                <div class="conversation-snippet">${conversation.latestEmail.snippet || 'No preview available'}</div>
            </div>
            <div class="conversation-emails" id="emails-${conversation.sender}" style="display: none;">
                ${conversation.emails.map(email => `
                    <div class="email-item" onclick="event.stopPropagation(); viewEmailDetails('${email.gmail_id}')">
                        <div class="email-content">
                            <div class="email-header">
                                <span class="email-sender">${email.sender}</span>
                                <span class="email-date">${formatDate(email.date_sent)}</span>
                            </div>
                            <div class="email-subject">${email.subject}</div>
                            <div class="email-snippet">${email.snippet || 'No preview available'}</div>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `).join('');
    
    container.innerHTML = conversationsHTML;
}

// Group emails by sender to create conversations
function groupEmailsByConversation(emails) {
    const conversationMap = new Map();
    
    emails.forEach(email => {
        const sender = email.sender;
        if (!conversationMap.has(sender)) {
            conversationMap.set(sender, {
                sender: sender,
                emails: [],
                latestEmail: null
            });
        }
        
        const conversation = conversationMap.get(sender);
        conversation.emails.push(email);
        
        // Keep track of the latest email
        if (!conversation.latestEmail || new Date(email.date_sent) > new Date(conversation.latestEmail.date_sent)) {
            conversation.latestEmail = email;
        }
    });
    
    // Convert to array and sort by latest email date
    return Array.from(conversationMap.values())
        .sort((a, b) => new Date(b.latestEmail.date_sent) - new Date(a.latestEmail.date_sent));
}

// Toggle conversation expansion
function toggleConversation(sender) {
    const emailsContainer = document.getElementById(`emails-${sender}`);
    const conversationCard = emailsContainer.closest('.conversation-card');
    const toggleIcon = conversationCard.querySelector('.conversation-toggle i');
    
    if (emailsContainer.style.display === 'none' || emailsContainer.style.display === '') {
        emailsContainer.style.display = 'block';
        toggleIcon.classList.remove('fa-chevron-down');
        toggleIcon.classList.add('fa-chevron-up');
    } else {
        emailsContainer.style.display = 'none';
        toggleIcon.classList.remove('fa-chevron-up');
        toggleIcon.classList.add('fa-chevron-down');
    }
}

// Load user contacts from database
async function loadUserContacts() {
    if (!googleUser) return;
    
    try {
        const response = await fetch(`/api/contacts/${googleUser.sub}`);
        const result = await response.json();
        
        if (result.success) {
            if (result.contacts && result.contacts.length > 0) {
                displayContacts(result.contacts);
                updateContactCount(result.contacts.length);
            } else {
                showEmptyState('contactsContainer', 'No contacts yet', 'Sync your emails to discover your contacts');
            }
        } else {
            showEmptyState('contactsContainer', 'No contacts yet', 'Sync your emails to discover your contacts');
        }
    } catch (error) {
        console.error('Error loading contacts:', error);
        showMessage('Error loading contacts. Please try again.', 'error');
    }
}

// Display contacts
function displayContacts(contacts) {
    const container = document.getElementById('contactsContainer');
    if (!container) return;
    
    const contactsHTML = contacts.map(contact => `
        <div class="contact-item" onclick="viewContactConversation('${contact.contact_email}')">
            <div class="contact-avatar">
                ${contact.contact_name.charAt(0).toUpperCase()}
            </div>
            <div class="contact-info">
                <div class="contact-name">${contact.contact_name}</div>
                <div class="contact-email">${contact.contact_email}</div>
            </div>
        </div>
    `).join('');
    
    container.innerHTML = contactsHTML;
}

// Update contact count
function updateContactCount(count) {
    const contactCount = document.getElementById('contactCount');
    if (contactCount) {
        contactCount.textContent = `${count} contacts`;
    }
}

// Load user follow-ups from database
async function loadUserFollowUps() {
    if (!googleUser) return;
    
    try {
        const response = await fetch(`/api/follow-ups/${googleUser.sub}`);
        const result = await response.json();
        
        if (result.success) {
            if (result.followUps && result.followUps.length > 0) {
                displayFollowUps(result.followUps);
            } else {
                showEmptyState('followUpsContainer', 'No follow-ups yet', 'Analyze your conversations to find networking opportunities');
            }
        } else {
            showEmptyState('followUpsContainer', 'No follow-ups yet', 'Analyze your conversations to find networking opportunities');
        }
    } catch (error) {
        console.error('Error loading follow-ups:', error);
        showMessage('Error loading follow-ups. Please try again.', 'error');
    }
}

// Display follow-ups
function displayFollowUps(followUps) {
    const container = document.getElementById('followUpsContainer');
    if (!container) return;
    
    const followUpsHTML = followUps.map(followUp => `
        <div class="follow-up-item">
            <div class="follow-up-header">
                <div class="follow-up-contact">
                    <div class="follow-up-name">${followUp.contact_name}</div>
                    <div class="follow-up-email">${followUp.contact_email}</div>
                </div>
                <div class="follow-up-score">Score: ${followUp.networking_score}/10</div>
            </div>
            <div class="follow-up-content">
                <div class="follow-up-summary">${followUp.conversation_summary}</div>
                <div class="follow-up-reason">${followUp.followup_reason}</div>
            </div>
            <div class="follow-up-actions">
                <button class="follow-up-btn btn-completed" onclick="updateFollowUpStatus(${followUp.id}, 'completed')">
                    Mark Complete
                </button>
                <button class="follow-up-btn btn-dismiss" onclick="updateFollowUpStatus(${followUp.id}, 'dismissed')">
                    Dismiss
                </button>
                <button class="follow-up-btn btn-view-conversation" onclick="viewContactConversation('${followUp.contact_email}')">
                    View Conversation
                </button>
            </div>
        </div>
    `).join('');
    
    container.innerHTML = followUpsHTML;
}

// Update email count in the UI
function updateEmailCount(newCount) {
    const connectBtn = document.getElementById('connectGmailBtn');
    if (connectBtn && connectBtn.innerHTML.includes('Gmail Connected')) {
        // Update the button to show new email count
        connectBtn.innerHTML = `<i class="fas fa-envelope"></i> Gmail Connected (${newCount} new)`;
        connectBtn.style.background = '#3b82f6';
    }
}

// Connect Gmail and automatically show emails
async function connectGmail() {
    if (!googleUser) return;
    
    try {
        showMessage('Connecting to Gmail...', 'info');
        
        // Get the Gmail access token from localStorage
        const gmailAccessToken = localStorage.getItem('gmailAccessToken');
        if (!gmailAccessToken) {
            showMessage('Gmail access not granted. Please sign in again and grant Gmail access.', 'error');
            return;
        }
        
        const gmailRefreshToken = localStorage.getItem('gmailRefreshToken');
        
        const response = await fetch('/api/sync-emails', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                google_id: googleUser.sub,
                access_token: gmailAccessToken,
                refresh_token: gmailRefreshToken
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showMessage(`Gmail connected! Found ${result.count} emails. Real-time monitoring started.`, 'success');
            
            // Update the button to show connected state
            const connectBtn = document.getElementById('connectGmailBtn');
            if (connectBtn) {
                connectBtn.innerHTML = '<i class="fas fa-check"></i> Gmail Connected';
                connectBtn.disabled = true;
                connectBtn.style.background = '#10b981';
            }
            
            // Show refresh and clear buttons
            const refreshBtn = document.getElementById('refreshEmailsBtn');
            const clearBtn = document.getElementById('clearTokensBtn');
            if (refreshBtn) {
                refreshBtn.style.display = 'inline-block';
            }
            if (clearBtn) {
                clearBtn.style.display = 'inline-block';
            }
            
            // Automatically load and show emails
            loadUserEmails();
            loadUserContacts();
        } else {
            showMessage('Error connecting to Gmail: ' + result.error, 'error');
        }
    } catch (error) {
        console.error('Error connecting to Gmail:', error);
        showMessage('Error connecting to Gmail. Please try again.', 'error');
    }
}

// Refresh emails manually
async function refreshEmails() {
    if (!googleUser) return;
    
    try {
        showMessage('Refreshing emails...', 'info');
        
        // Get the Gmail access token from localStorage
        const gmailAccessToken = localStorage.getItem('gmailAccessToken');
        if (!gmailAccessToken) {
            showMessage('Gmail access not granted. Please sign in again and grant Gmail access.', 'error');
            return;
        }
        
        const gmailRefreshToken = localStorage.getItem('gmailRefreshToken');
        
        const response = await fetch('/api/sync-emails', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                google_id: googleUser.sub,
                access_token: gmailAccessToken,
                refresh_token: gmailRefreshToken
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showMessage(`Refreshed! Found ${result.count} emails.`, 'success');
            
            // Reload emails and contacts
            loadUserEmails();
            loadUserContacts();
        } else {
            showMessage('Error refreshing emails: ' + result.error, 'error');
        }
    } catch (error) {
        console.error('Error refreshing emails:', error);
        showMessage('Error refreshing emails. Please try again.', 'error');
    }
}

// Clear Gmail tokens and reset connection
function clearGmailTokens() {
    try {
        // Clear Gmail tokens from localStorage
        localStorage.removeItem('gmailAccessToken');
        localStorage.removeItem('gmailRefreshToken');
        localStorage.removeItem('gmailTokenExpires');
        
        // Also clear Google Sign-In state
        localStorage.removeItem('googleUser');
        localStorage.removeItem('userProfile');
        
        // Reset the Connect Gmail button
        const connectBtn = document.getElementById('connectGmailBtn');
        if (connectBtn) {
            connectBtn.innerHTML = '<i class="fas fa-envelope"></i> Connect Gmail';
            connectBtn.disabled = false;
            connectBtn.style.background = '';
        }
        
        // Hide refresh button but keep clear button visible
        const refreshBtn = document.getElementById('refreshEmailsBtn');
        if (refreshBtn) refreshBtn.style.display = 'none';
        
        showMessage('All tokens cleared! Please sign in again and grant Gmail access.', 'success');
        
        // Clear the emails display
        const emailsContainer = document.getElementById('emailsContainer');
        if (emailsContainer) {
            emailsContainer.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-envelope-open"></i>
                    <h3>No emails yet</h3>
                    <p>Connect your Gmail account to see your emails</p>
                </div>
            `;
        }
        
        // Reset user state
        googleUser = null;
        
        // Show sign-in prompt
        showSignInPrompt();
        
    } catch (error) {
        console.error('Error clearing tokens:', error);
        showMessage('Error clearing tokens. Please try again.', 'error');
    }
}

// Analyze conversations for networking opportunities
async function analyzeConversations() {
    if (!googleUser) return;
    
    try {
        showMessage('Finding networking conversations... This may take a moment.', 'info');
        
        const response = await fetch(`/api/analyze-conversations/${googleUser.sub}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        const result = await response.json();
        
        if (result.success) {
            showMessage(result.message, 'success');
            loadUserFollowUps();
        } else {
            showMessage('Error analyzing conversations: ' + result.error, 'error');
        }
    } catch (error) {
        console.error('Error analyzing conversations:', error);
        showMessage('Error analyzing conversations. Please try again.', 'error');
    }
}

// Update follow-up status
async function updateFollowUpStatus(followUpId, status) {
    try {
        const response = await fetch(`/api/follow-up/${followUpId}/status`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ status })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showMessage('Follow-up updated successfully', 'success');
            loadUserFollowUps();
        } else {
            showMessage('Error updating follow-up: ' + result.error, 'error');
        }
    } catch (error) {
        console.error('Error updating follow-up:', error);
        showMessage('Error updating follow-up. Please try again.', 'error');
    }
}

// View contact conversation
async function viewContactConversation(contactEmail) {
    if (!googleUser) return;
    
    try {
        const response = await fetch(`/api/conversation/${googleUser.sub}/${encodeURIComponent(contactEmail)}`);
        const result = await response.json();
        
        if (result.success) {
            showConversationModal(result.contact, result.conversation);
        } else {
            showMessage('Error loading conversation: ' + result.error, 'error');
        }
    } catch (error) {
        console.error('Error loading conversation:', error);
        showMessage('Error loading conversation. Please try again.', 'error');
    }
}

// Show conversation modal
function showConversationModal(contact, conversation) {
    // Create modal HTML
    const modalHTML = `
        <div class="conversation-modal" id="conversationModal">
            <div class="conversation-content">
                <div class="conversation-header">
                    <h3 class="conversation-title">Conversation with ${contact.contact_name}</h3>
                    <button class="close-btn" onclick="closeConversationModal()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="conversation-messages">
                    ${conversation.map(email => `
                        <div class="conversation-message ${email.is_sent ? 'sent' : 'received'}">
                            <div class="message-header">
                                <div class="message-sender">
                                    ${email.is_sent ? 'You' : (contact.contact_name || email.sender)}
                                </div>
                                <div class="message-date">${formatDate(email.date_sent)}</div>
                            </div>
                            <div class="message-subject">${email.subject}</div>
                            <div class="message-body">${email.snippet}</div>
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>
    `;
    
    // Add modal to page
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

// Close conversation modal
function closeConversationModal() {
    const modal = document.getElementById('conversationModal');
    if (modal) {
        modal.remove();
    }
}

// View email details
function viewEmailDetails(emailId) {
    // This would open a detailed view of the email
    console.log('Viewing email details for:', emailId);
}

// Show empty state
function showEmptyState(containerId, title, message) {
    const container = document.getElementById(containerId);
    if (container) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-inbox"></i>
                <h3>${title}</h3>
                <p>${message}</p>
            </div>
        `;
    }
}

// Show message
function showMessage(text, type) {
    const messageContainer = document.getElementById('messageContainer');
    if (!messageContainer) return;
    
    const message = document.createElement('div');
    message.className = `message ${type}`;
    message.textContent = text;
    
    messageContainer.appendChild(message);
    
    // Remove message after 5 seconds
    setTimeout(() => {
        if (message.parentNode) {
            message.parentNode.removeChild(message);
        }
    }, 5000);
}

// Format date
function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) {
        return 'Yesterday';
    } else if (diffDays < 7) {
        return `${diffDays} days ago`;
    } else {
        return date.toLocaleDateString();
    }
}


// Toggle theme
function toggleTheme() {
    document.body.classList.toggle('dark-theme');
    // This would implement dark theme functionality
    console.log('Theme toggled');
}

// Toggle user menu
function toggleUserMenu() {
    const userMenu = document.getElementById('userMenu');
    if (userMenu) {
        userMenu.remove();
        return;
    }
    
    // Create user menu
    const menuHTML = `
        <div class="user-menu" id="userMenu">
            <div class="user-menu-item" onclick="viewProfile()">
                <i class="fas fa-user"></i>
                <span>Profile</span>
            </div>
            <div class="user-menu-item" onclick="openSettings()">
                <i class="fas fa-cog"></i>
                <span>Settings</span>
            </div>
            <div class="user-menu-divider"></div>
            <div class="user-menu-item logout" onclick="signOut()">
                <i class="fas fa-sign-out-alt"></i>
                <span>Sign Out</span>
            </div>
        </div>
    `;
    
    // Add menu to user profile section
    const userProfile = document.querySelector('.user-profile');
    if (userProfile) {
        userProfile.insertAdjacentHTML('beforeend', menuHTML);
    }
}

// View profile
function viewProfile() {
    showMessage('Profile feature coming soon!', 'info');
    closeUserMenu();
}

// Open settings
function openSettings() {
    switchTab('settings');
    closeUserMenu();
}

// Close user menu
function closeUserMenu() {
    const userMenu = document.getElementById('userMenu');
    if (userMenu) {
        userMenu.remove();
    }
}

// Sign out function
function signOut() {
    googleUser = null;
    localStorage.removeItem('googleUser');
    
    // Reset UI
    showSignInPrompt();
    
    // Clear all data
    const containers = ['emailsContainer', 'contactsContainer', 'followUpsContainer'];
    containers.forEach(containerId => {
        const container = document.getElementById(containerId);
        if (container) {
            container.innerHTML = '';
        }
    });
    
    // Reset user profile in sidebar
    const userAvatar = document.getElementById('userAvatar');
    const userName = document.querySelector('.user-name');
    
    if (userAvatar) {
        userAvatar.innerHTML = '<i class="fas fa-user"></i>';
    }
    if (userName) {
        userName.textContent = 'Guest';
    }
    
    showMessage('Signed out successfully', 'success');
}