
#  LEO Satellite Tracking & Collision Alert System using TLE Data

A full-stack, web-based application for **tracking Low Earth Orbit (LEO) satellites**, visualizing their motion in **3D and 2D**, and **detecting potential satellite collisions** using Two-Line Element (TLE) data.

This project combines **orbital mechanics**, **numerical methods**, and **modern web development** into a single, unified platform.

---

##  Project Overview

The **LEO Satellite Tracking and Collision Alert System** allows users to:

- Upload satellite TLE data
- Track real-time and predicted satellite positions
- Visualize orbits on a **3D Earth (Cesium.js)** and **2D world map**
- Detect close-approach collisions between satellites
- Receive visual alerts when satellites come within **50 km**

The system includes **secure authentication**, **user dashboards**, **data logs**, and **interactive visual analytics**, making it both an educational and functional aerospace web application.

---

## Objectives

- Build an interactive platform for uploading and tracking LEO satellites
- Implement accurate orbital propagation using **RK4 + J2 perturbation**
- Detect and alert users of potential satellite collisions
- Provide realistic 3D and 2D visualizations of satellite motion
- Maintain a secure, modern, and user-friendly web interface

---

##  Major Features

###  1. Home Page
- Modern, space-themed UI
- Project title and branding
- Main actions:
  - **Track Satellite**
  - **Activate Alert System**
- Navigation bar:
  - Login / Register
  - About
  - User Dashboard
- Animated Earth background

---

###  2. User Authentication (Supabase)
- Email-based login and registration
- Features:
  - Email verification
  - Forgot password & reset link
  - JWT-based session handling
- Only authenticated users can access tracking and alert features

---

###  3. Track Satellite Workflow

#### Step 1: Select Number of Satellites
- User specifies how many satellites to track (1, 2, 3, ...)

#### Step 2: Upload TLE Data


#### Step 3: Orbit Computation (Backend)
- Backend (FastAPI + Python):
- Parses TLE data
- Converts to orbital elements
- Computes ECI position and velocity
- Applies RK4 propagation with J2 perturbation
- Predicts future satellite positions

#### Step 4: Visualization
- Frontend (React + Cesium.js) renders:
- 3D satellite motion around Earth
- 2D ground track
- Displays:
- Latitude
- Longitude
- Altitude
- Velocity vector
- Satellite name
- Timestamp

#### Step 5: Satellite Details Page
- View:
- Uploaded TLE data
- Orbital elements
- Current & predicted coordinates
- 3D orbit visualization
- Prediction logs

---

###  4. Activate Satellite Collision Alert System

#### Step 1: Number of Satellites
- Minimum: **2 satellites**
- Error shown if less than 2

#### Step 2: Current Position Computation
- Backend propagates all satellites to current time

#### Step 3: Collision Distance Check
- Pairwise distance computation between satellites
- Threshold: **50 km**

#### Step 4: Visual Alerts
-  **Red Alert**: Collision risk detected
-  **Green Status**: All satellites are safe
- Displays names/IDs of satellites in proximity

---

###  5. User Dashboard
- Uploaded satellite list
- Orbit prediction history
- Collision alert logs
- Actions:
- Re-run predictions
- View satellites on map
- Delete uploaded data

---

###  6. About Page
- Project purpose
- Technologies used
- Overview of LEO satellite tracking
- Educational explanation of orbital mechanics

---

##  Technology Stack

| Layer | Technology |
|------|-----------|
| Frontend | React.js, Cesium.js, Tailwind CSS, Axios |
| Backend | FastAPI (Python) |
| Database | Supabase PostgreSQL |
| Authentication | Supabase Auth |
| 3D Visualization | Cesium.js (User Access Token) |
| 2D Map | Cesium 2D View / Leaflet.js |
| Algorithm | RK4 + J2 Perturbation Model |
| Deployment | Vercel / Netlify (Frontend), Render / AWS / Railway (Backend) |
| Version Control | Git & GitHub |

---

##  Core Algorithm (Backend Logic)

1. **Read TLE**
 - Parse satellite name, Line 1, Line 2

2. **Extract Orbital Elements**
 - Semi-major axis (a)
 - Eccentricity (e)
 - Inclination (i)
 - RAAN (Ω)
 - Argument of Perigee (ω)
 - Mean Anomaly (M)

3. **Compute State Vectors**
 - Convert orbital elements → ECI position (r) and velocity (v)

4. **Apply J2 Perturbation**
 - Account for Earth’s oblateness in acceleration model

5. **RK4 Numerical Propagation**
 - Integrate equations of motion
 - Predict future position and velocity

6. **Coordinate Conversion**
 - ECI → Latitude, Longitude, Altitude

7. **Send Results**
 - r, v, lat, lon, alt, timestamp → Frontend

## System Architecture Diagram

<img width="1081" height="763" alt="image" src="https://github.com/user-attachments/assets/bcd084c4-4097-4ac3-810e-2eaf2ce6adf2" />


## Future Enhancements

- Live TLE fetching from Celestrak / NORAD
- Email & push notifications for collision alerts
- Time-based orbit animation
- ML-based orbit anomaly detection
- Integration with live satellite tracking APIs

---

##  Conclusion

This project successfully integrates **astrodynamics**, **numerical simulation**, and **modern full-stack web development** to create a realistic and interactive LEO satellite tracking system.

It allows users to:
- Upload TLE data
- Simulate satellite motion
- Visualize orbits in real time
- Detect and alert potential collision risks

The system serves as both:
-  An educational tool for orbital mechanics
-  A prototype platform for satellite operations and space safety

---

##  Author

**Aditi Kumari**  
Final Year Engineering Student  
Project Domain: Aerospace + Full Stack Development  

---

⭐ *If you find this project useful, consider starring the repository!* ⭐
