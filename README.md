# React User Profile Cards

## Overview

AssistantHub is a dynamic web application designed to help users discover and manage personal assistants. The app allows users to view and interact with profiles of various assistants, including their names, images, and contact details. Users can:

- **Search and Sort**: Use the search bar to filter profiles based on names and sort them by likes or proximity to the current location.
- **Manage Cards**: Add or remove assistant profiles to/from the view, with the number of profiles adjustable up to a maximum of 10.
- **Like Profiles**: Show appreciation for profiles by liking them, which influences their sort order.
- **Add to Favorites**: Save favorite assistants to a list, with the ability to export this list to a CSV file.
- **Send Inquiries**: Contact assistants via an inquiry form and view all sent inquiries in a dedicated modal.
- **View Added Info and Inquiries**: Access detailed information and sent inquiries about assistants in a modal popup.

The app features interactive profile cards with QR codes, likes counters, and dynamic sorting based on user preferences and location proximity. It uses React for the frontend, integrating various components such as modals and buttons to enhance user experience and functionality.

## Features

- **Contact Modal**: Added the ability to send inquiries to assistants via a contact modal. Users can input their message and submit it directly through the interface.
- **Map Integration**: Users can view the location of assistants on a map embedded within a modal. This feature uses Leaflet to render maps and markers.
- **Clipboard Copy**: Implemented functionality to allow users to copy assistant contact information (email and phone) to the clipboard with a simple click.
- **Responsive Layout**: Ensured the profile cards and other UI components are fully responsive, adapting seamlessly to different screen sizes.
- **Unit Testing**: Introduced comprehensive unit tests for key components like `SearchBar`, `ProfileCards`, and `ContactModal` to ensure reliable and maintainable code.

## Technologies Used

- **React**: Front-end library for building the user interface.
- **Axios**: Promise-based HTTP client for making API requests.
- **Leaflet**: JavaScript library for mobile-friendly interactive maps.
- **React Testing Library**: Testing utilities for React components.
- **Jest**: JavaScript testing framework.
- **CSS**: For styling the components and layout.
- **RandomUser API**: Provides random user data from [random user api](https://randomuser.me/).

## Installation and Testing

1. **Clone the repository and Navigate to the project directory**
2. **Install dependencies and Start the development server**
    - Run `npm install` to install dependencies.
    - Run `npm start` to start the development server.
    - The application will be available at [http://localhost:3000](http://localhost:3000) or [http://localhost:3000/AssistantHub](http://localhost:3000/AssistantHub).
    - The application is deployed at [https://leo0331.github.io/AssistantHub/](https://leo0331.github.io/AssistantHub/) using [react-gh-pages](https://github.com/gitname/react-gh-pages).
3. Run `npm test` to run 9 unit test cases.

![Testing](https://github.com/LEO0331/AssistantHub/blob/main/public/Screenshot%202024-08-29%20at%2010.30.58%E2%80%AFPM.png)

## Usage

- **Search**: Use the search bar to filter profiles by typing in the assistant's name.
- **Profile Management**: Add or remove profiles dynamically and manage the display of up to 10 profiles.
- **Inquiries**: Click on an assistant's name to open a modal for sending inquiries directly.
- **Maps**: View an assistant's location on a map by clicking the location icon.
- **Copy to Clipboard**: Click on email or phone information to copy it to your clipboard.

![Demo Version 1](https://github.com/LEO0331/AssistantHub/blob/main/public/Screenshot%202024-08-29%20at%2010.36.54%E2%80%AFPM.png)

## Components

- **ProfileCards**: Displays individual user profile information including name, email, phone, image, cell, description, and ID. Integrates functionalities such as like button, inquiry modal, and location map.
- **SearchBar**: A simple input component that allows users to search profiles by name.
- **ContactModal**: Handles user inquiries via a modal form.
- **App**: Manages the state for the number of cards, handles input changes, fetches user data from the API, and renders the profile cards.
