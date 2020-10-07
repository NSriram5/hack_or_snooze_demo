$(async function() {
    // cache some selectors we'll be using quite a bit
    const $allStoriesList = $("#all-articles-list");
    const $submitForm = $("#submit-form");
    const $filteredArticles = $("#filtered-articles");
    const $loginForm = $("#login-form");
    const $createAccountForm = $("#create-account-form");
    const $ownStories = $("#my-articles");
    const $navLogin = $("#nav-login");
    const $navLogOut = $("#nav-logout");
    const $validuser = $(".user-validated");
    const $favArticles = $("#favorited-articles");
    const $myArticles = $("#my-articles");


    // global storyList variable
    let storyList = null;

    // global currentUser variable
    let currentUser = null;

    await checkIfLoggedIn();

    /**
     * Event listener for creating a new story
     */
    $submitForm.on("submit", async function(evt) {
        evt.preventDefault();
        story = {
            author: $("#author").val(),
            title: $("#title").val(),
            url: $("#url").val(),
            username: currentUser,
            storyID: "none",
            createdAt: "test1",
            updatedAt: "test2"
        }
        story = await storyList.addStory(currentUser, story);
        currentUser.ownStories.push(story);
        hideElements();
        $allStoriesList.show();
        await generateStories();
        //$allStoriesList.prepend(story);

    })

    /**
     * Event listener for logging in.
     *  If successfully we will setup the user instance
     */

    $loginForm.on("submit", async function(evt) {
        evt.preventDefault(); // no page-refresh on submit

        // grab the username and password
        const username = $("#login-username").val();
        const password = $("#login-password").val();

        // call the login static method to build a user instance
        const userInstance = await User.login(username, password);
        // set the global user to the user instance
        currentUser = userInstance;
        syncCurrentUserToLocalStorage();
        loginAndSubmitForm();
    });

    /**
     * Event listener for signing up.
     *  If successfully we will setup a new user instance
     */

    $createAccountForm.on("submit", async function(evt) {
        evt.preventDefault(); // no page refresh

        // grab the required fields
        let name = $("#create-account-name").val();
        let username = $("#create-account-username").val();
        let password = $("#create-account-password").val();

        // call the create method, which calls the API and then builds a new user instance
        const newUser = await User.create(username, password, name);
        currentUser = newUser;
        syncCurrentUserToLocalStorage();
        loginAndSubmitForm();
    });

    /**
     * Log Out Functionality
     */

    $navLogOut.on("click", function() {
        // empty out local storage
        localStorage.clear();
        // refresh the page, clearing memory
        location.reload();
    });

    /**
     * Event Handler for Clicking Login
     */

    $navLogin.on("click", function() {
        // Show the Login and Create Account Forms
        $loginForm.slideToggle();
        $createAccountForm.slideToggle();
        $allStoriesList.toggle();
    });

    /**
     * Event handler for Navigation to Homepage
     */

    $("body").on("click", "#nav-all", async function() {
        hideElements();
        await generateStories();
        $allStoriesList.show();
        $favArticles.hide();
        $myArticles.hide();
    });

    /**
     * Event handler for Opening submit form
     */

    $("body").on("click", ".main-nav-links", async function(evt) {
        evt.preventDefault();
        switch (evt.target.id) {
            case "nav-submit-story":
                $submitForm.show();

                break;
            case "nav-favorites":
                refreshFavorites();
                $favArticles.show();
                $myArticles.hide();
                $allStoriesList.hide();
                break;
            case "nav-my-stories":
                refreshMystories();
                $myArticles.show();
                $favArticles.hide();
                $allStoriesList.hide();
                break;

        }
    })

    /**
     * Event handler for clicking on a favorite star
     */
    $allStoriesList.on("click", ".star", togglefave);
    $favArticles.on("click", ".star", togglefave);

    /** 
     * Event handler for clicking delete story button
     */
    $allStoriesList.on("click", ".trash-can", delBtnStory);
    $favArticles.on("click", ".trash-can", delBtnStory);
    $myArticles.on("click", ".trash-can", delBtnStory);

    /**
     * On page load, checks local storage to see if the user is already logged in.
     * Renders page information accordingly.
     */

    async function checkIfLoggedIn() {
        // let's see if we're logged in
        const token = localStorage.getItem("token");
        const username = localStorage.getItem("username");

        // if there is a token in localStorage, call User.getLoggedInUser
        //  to get an instance of User with the right details
        //  this is designed to run once, on page load
        currentUser = await User.getLoggedInUser(token, username);
        await generateStories(currentUser);
        if (currentUser) {
            showNavForLoggedInUser();
        }
    }

    /**
     * A rendering function to run to reset the forms and hide the login info
     */

    function loginAndSubmitForm() {
        // hide the forms for logging in and signing up
        $loginForm.hide();
        $createAccountForm.hide();

        // reset those forms
        $loginForm.trigger("reset");
        $createAccountForm.trigger("reset");

        // show the stories
        generateStories(currentUser);
        $allStoriesList.show();


        // update the navigation bar
        showNavForLoggedInUser();
    }

    /**
     * A rendering function to call the StoryList.getStories static method,
     *  which will generate a storyListInstance. Then render it.
     */

    async function generateStories() {
        // get an instance of StoryList
        const storyListInstance = await StoryList.getStories();
        // update our global variable
        storyList = storyListInstance;
        // empty out that part of the page
        $allStoriesList.empty();
        $favArticles.empty().text("My favorites");
        $myArticles.empty().text("My articles");
        if (currentUser !== null) {
            currentUser.ownStories = [];
        }

        // loop through all of our stories and generate HTML for them
        for (let story of storyList.stories) {
            const result = generateStoryHTML(story);
            $allStoriesList.append(result);
            if (currentUser !== null && story.username === currentUser.username) {
                currentUser.ownStories.push(story);
            }
        }
    }

    function refreshFavorites() {
        let storiesList = currentUser.favorites;
        $favArticles.empty().text("My favorites");
        for (let story of storiesList) {
            const result = generateStoryHTML(story);
            $favArticles.append(result);
        }
    }

    function refreshMystories() {
        let storiesList = currentUser.ownStories;
        $myArticles.empty().text("My articles");
        for (let story of storiesList) {
            const result = generateStoryHTML(story);
            $myArticles.append(result);
        }
    }
    /**
     * Get correct star html
     */
    function getCorrectStar(story) {
        if (currentUser === null) {
            return "";
        }
        let isFav = currentUser.favorites.some((fave) => fave.storyId === story.storyId)
        let starType = isFav ? "fas" : "far";
        return `<span class="star"><i class="fa-star ${starType}"></i></span>`;
    }

    function addTrashCan(story) {
        if (currentUser === null) {
            return "";
        } else if (currentUser.username === story.username) {
            return `<span class="trash-can"><i class="fas fa-trash-alt"></i></span>`;
        } else { return "" }
    }
    /**
     * A function to render HTML for an individual Story instance
     */
    function generateStoryHTML(story) {
        let hostName = getHostName(story.url);
        // render story markup
        const storyMarkup = $(`
      <li id="${story.storyId}">
        ${getCorrectStar(story)}
        <a class="article-link" href="${story.url}" target="a_blank">
          <strong>${story.title}</strong>
        </a>
        <span><small class="article-hostname ${hostName}">(${hostName})</small></span>
        <span><small class="article-author">by ${story.author}</small></span>
        ${addTrashCan(story)}
        <span class="linebreak"></span>
        <small class="article-username">posted by ${story.username}</small>
      </li>
    `);

        return storyMarkup;
    }

    /* hide all elements in elementsArr */

    function hideElements() {
        const elementsArr = [
            $submitForm,
            $allStoriesList,
            $filteredArticles,
            $ownStories,
            $loginForm,
            $createAccountForm
        ];
        elementsArr.forEach($elem => $elem.hide());
    }

    function showNavForLoggedInUser() {
        $navLogin.hide();
        $navLogOut.show();
        $validuser.show();
        $navLogOut.prepend($(`<small>${currentUser.name}</small>`));
        $("#profile-name").text(`Name: ${currentUser.name}`);
        $("#profile-username").text(`Username: ${currentUser.username}`);
        $("#profile-account-date").text(`Account Created: ${currentUser.createdAt}`);
    }

    /* simple function to pull the hostname from a URL */

    function getHostName(url) {
        let hostName;
        if (url.indexOf("://") > -1) {
            hostName = url.split("/")[2];
        } else {
            hostName = url.split("/")[0];
        }
        if (hostName.slice(0, 4) === "www.") {
            hostName = hostName.slice(4);
        }
        return hostName;
    }

    /* sync current user information to localStorage */

    function syncCurrentUserToLocalStorage() {
        if (currentUser) {
            localStorage.setItem("token", currentUser.loginToken);
            localStorage.setItem("username", currentUser.username);
        }
    }

    async function togglefave(evt) {
        let storyId = evt.currentTarget.parentElement.id;
        if (currentUser != null) {
            if (evt.target.classList.contains("far")) {
                await currentUser.addFavorite(storyId);
                evt.target.classList.add("fas");
                evt.target.classList.remove("far");
                currentUser.favorites.push(storyList.stories.find((story) => story.storyId = storyId));
            } else {
                await currentUser.delFavorite(storyId);
                evt.target.classList.add("far");
                evt.target.classList.remove("fas");
                currentUser.favorites = currentUser.favorites.filter((story) => story.storyId !== storyId);
            }
        }
    }

    async function delBtnStory(evt) {
        let storyId = evt.currentTarget.parentElement.id;
        storyList = await storyList.delStory(currentUser, storyId);
        refreshFavorites();
        refreshMystories();
        $allStoriesList.empty();
        for (let story of storyList.stories) {
            const result = generateStoryHTML(story);
            $allStoriesList.append(result);
        }
    }
});