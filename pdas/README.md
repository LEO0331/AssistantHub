# React User Profile Cards

## Overview

This React application allows users to dynamically fetch and display profile cards based on user input. Users can specify the number of profile cards they want to display (up to a maximum of 10), and the application will fetch random user data from an API and render it as profile cards. The project showcases how to handle user input, make API requests, and conditionally render components.

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
    - The application will be available at http://localhost:3000

## Usage
- Input Field: Enter a number between 0 and 10 in the input field to specify how many profile cards you want to display.
- Profile Cards Display: The profile cards will automatically update based on the number entered.
- ![Demo website](https://github.com/LEO0331/side-projects-demo/blob/main/pdas/public/Screenshot%202024-08-18%20at%2011.13.05%E2%80%AFPM.png)

## Components
- ProfileCards: Displays individual user profile information including name, email, phone, image, cell, description, and ID.
- App: Manages the state for the number of cards, handles input changes, fetches user data from the API, and renders the profile cards.
