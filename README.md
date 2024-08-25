# React User Profile Cards

## Overview

AssistantHub is a dynamic web application designed to help users discover and manage personal assistants. The app allows users to view and interact with profiles of various assistants, including their names, images, and contact details. Users can:

- Search and Sort: Use the search bar to filter profiles based on names and sort them by likes or proximity to the current location.
- Manage Cards: Add or remove assistant profiles to/from the view, with the number of profiles adjustable up to a maximum of 10.
- Like Profiles: Show appreciation for profiles by liking them, which influences their sort order.
- Add to Favorites: Save favorite assistants to a list, with the ability to export this list to a CSV file.
- Send Inquiries: Contact assistants via an inquiry form and view all sent inquiries in a dedicated modal.
- View Added Info: Access detailed information about saved assistants in a modal popup.

The app features interactive profile cards with QR codes, likes counters, and dynamic sorting based on user preferences and location proximity. It uses React for the frontend, integrating various components such as modals and buttons to enhance user experience and functionality.

## Features

- **Dynamic Profile Cards**: Fetch and display user profile cards based on user input.
- **Input Validation**: Cap the number of cards to a maximum of 10 and handle zero input to clear the cards.
- **Responsive Design**: Layout is responsive and adjusts according to screen size using CSS classes.

## Technologies Used

- **React**: Front-end library for building the user interface.
- **Axios**: Promise-based HTTP client for making API requests.
- **CSS**: For styling the components and layout.
- **RandomUser API**: Provides random user data from [random user api](https://randomuser.me/).

## Installation

1. **Clone the repository and Navigate to the project directory**
2. **Install dependencies and Start the development server**
    - `npm install` and `npm start`
    - The application will be available at http://localhost:3000 or http://localhost:3000/AssistantHub
    - The application is deployed at https://leo0331.github.io/AssistantHub/ followed by [react-gh-pages](https://github.com/gitname/react-gh-pages?tab=readme-ov-file)

## Usage
- Input Field: Enter a number between 0 and 10 in the input field to specify how many profile cards you want to display.
- Profile Cards Display: The profile cards will automatically update based on the number entered.

![Demo website](https://github.com/LEO0331/AssistantHub/blob/main/AssistantHubpublic/Screenshot%202024-08-18%20at%2011.13.05%E2%80%AFPM.png)

## Components
- ProfileCards: Displays individual user profile information including name, email, phone, image, cell, description, and ID.
- App: Manages the state for the number of cards, handles input changes, fetches user data from the API, and renders the profile cards.
