import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useNotification } from "../contexts/NotificationContext";
import { useConfirm } from "../contexts/ConfirmContext";
import NavBar from "./NavBar";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
  getDoc,
  orderBy,
} from "firebase/firestore";
import { db } from "../firebase";
import MaterialsViewer from "./MaterialsViewer";
import ChatInterface from "./ChatInterface";

// Define Schedule interface
interface Schedule {
  id: string;
  moduleTitle: string;
  floorNumber: string;
  classroomNumber: string;
  lecturerName: string;
  branch: string;
  startTime: string;
  endTime: string;
  date: string;
  dayOfWeek: string;
  isRecurring: boolean;
}

// Define Course interface
interface Course {
  id: string;
  title: string;
  code: string;
  level: string;
  description: string;
  department: string;
  duration: number;
  credits: number;
  modules: string[];
  coordinator: string;
  status: string;
}

// Define Enrollment interface
interface Enrollment {
  id: string;
  courseId: string;
  academicYear: string;
  semester: number;
  status: string;
}

export default function StudentDashboard() {
  const { userData, logout, currentUser } = useAuth();
  const { showNotification } = useNotification();
  const { showConfirm } = useConfirm();
  const navigate = useNavigate();

  const [activeSection, setActiveSection] = useState("dashboard");
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [schedulesLoading, setSchedulesLoading] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Courses state
  const [enrolledCourses, setEnrolledCourses] = useState<
    (Course & { enrollment: Enrollment })[]
  >([]);
  const [coursesLoading, setCoursesLoading] = useState(true);

  // Profile state
  const [isEditing, setIsEditing] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("");
  const [age, setAge] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [profileImage, setProfileImage] = useState("");

  // Logo URL for collapsed sidebar
  const logoUrl =
    "https://png.pngtree.com/png-vector/20220922/ourmid/pngtree-letter-v-icon-png-image_6210719.png";

  // Function to toggle sidebar
  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  // Function to toggle mobile sidebar
  const toggleMobileSidebar = () => {
    setMobileOpen(!mobileOpen);
  };

  useEffect(() => {
    if (!userData) {
      navigate("/login");
      return;
    }

    // Fetch student schedules based on branch or other criteria
    async function fetchStudentSchedules() {
      try {
        setSchedulesLoading(true);
        // This is a placeholder - you would typically filter based on student's branch, class, etc.
        const schedulesCollection = collection(db, "schedules");
        const scheduleSnapshot = await getDocs(schedulesCollection);

        const scheduleList = scheduleSnapshot.docs.map(
          (doc) =>
            ({
              id: doc.id,
              ...doc.data(),
            } as Schedule)
        );

        setSchedules(scheduleList);
        // Show success message using notification system
        if (scheduleList.length > 0) {
          showNotification(`Found ${scheduleList.length} class schedules`);
        }
      } catch (err) {
        console.error("Error fetching schedules:", err);
        showNotification("Failed to load your class schedules");
      } finally {
        setSchedulesLoading(false);
      }
    }

    fetchStudentSchedules();

    // Fetch enrolled courses
    async function fetchEnrolledCourses() {
      if (!currentUser) return;

      try {
        setCoursesLoading(true);

        // Get student enrollments
        const enrollmentsCollection = collection(db, "enrollments");
        const enrollmentsQuery = query(
          enrollmentsCollection,
          where("studentId", "==", currentUser.uid)
        );
        const enrollmentsSnapshot = await getDocs(enrollmentsQuery);

        if (enrollmentsSnapshot.empty) {
          setCoursesLoading(false);
          return;
        }

        // Get course details for each enrollment
        const coursesWithEnrollment = await Promise.all(
          enrollmentsSnapshot.docs.map(async (enrollmentDoc) => {
            const enrollmentData = enrollmentDoc.data() as Enrollment;
            enrollmentData.id = enrollmentDoc.id;

            // Get course data
            const courseRef = doc(db, "courses", enrollmentData.courseId);
            const courseSnapshot = await getDoc(courseRef);

            if (courseSnapshot.exists()) {
              const courseData = courseSnapshot.data() as Course;
              return {
                ...courseData,
                id: enrollmentData.courseId,
                enrollment: enrollmentData,
              };
            }
            return null;
          })
        );

        // Filter out null values and set state
        const validCourses = coursesWithEnrollment.filter(
          (course): course is Course & { enrollment: Enrollment } =>
            course !== null
        );
        setEnrolledCourses(validCourses);

        if (validCourses.length > 0) {
          showNotification(`Found ${validCourses.length} enrolled courses`);
        }
      } catch (err) {
        console.error("Error fetching enrolled courses:", err);
        showNotification("Failed to load your enrolled courses");
      } finally {
        setCoursesLoading(false);
      }
    }

    fetchEnrolledCourses();
  }, [userData, navigate, showNotification, currentUser]);

  // Load profile data when component mounts or activeSection changes to profile
  useEffect(() => {
    if (activeSection === "profile" && userData) {
      setName(userData.name || "");
      setEmail(userData.email || "");
      setRole(userData.role || "");
      setAge(userData.age || "");
      setAddress(userData.address || "");
      setPhone(userData.phone || "");
      setProfileImage(userData.profileImage || "");
    }
  }, [activeSection, userData]);

  const handleLogout = () => {
    showConfirm(
      {
        title: "Confirm Logout",
        message: "Are you sure you want to log out?",
        confirmLabel: "Logout",
        cancelLabel: "Cancel",
        variant: "warning",
        icon: "bi-box-arrow-right",
      },
      async () => {
        try {
          await logout();
          showNotification("Successfully logged out");
          navigate("/login");
        } catch (err) {
          console.error("Error logging out:", err);
          showNotification("Failed to log out. Please try again.");
        }
      }
    );
  };

  const handleViewMaterials = (courseTitle: string) => {
    showNotification(`Loading materials for ${courseTitle}...`);
    // Placeholder for actual implementation
  };

  // Profile update handler
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentUser) {
      showNotification("You must be logged in to update your profile");
      return;
    }

    setProfileLoading(true);

    try {
      const userDocRef = doc(db, "users", currentUser.uid);

      // Update user profile in Firestore
      await updateDoc(userDocRef, {
        name,
        age,
        address,
        phone,
        profileImage,
      });

      setIsEditing(false);
      showNotification("Profile updated successfully");
    } catch (error) {
      console.error("Error updating profile:", error);
      showNotification("Failed to update profile");
    } finally {
      setProfileLoading(false);
    }
  };

  // Render the main content based on active section
  const renderContent = () => {
    switch (activeSection) {
      case "dashboard":
        return renderDashboardSection();
      case "schedule":
        return renderScheduleSection();
      case "classes":
        return renderClassesSection();
      case "courses":
        return renderCoursesSection();
      case "materials":
        return renderMaterialsSection();
      case "grades":
        return renderGradesSection();
      case "chat":
        return renderChatSection();
      case "profile":
        return renderProfileSection();
      default:
        return renderDashboardSection();
    }
  };

  // Dashboard section (overview)
  const renderDashboardSection = () => (
    <div className="slide-in section-content">
      <div className="section-title mb-4">
        <i className="bi bi-speedometer2"></i>
        Dashboard Overview
      </div>

      {/* Student Dashboard Cards */}
      <div className="row g-4 mb-5">
        <div className="col-sm-6 col-lg-3">
          <div
            className="dashboard-card"
            onClick={() => setActiveSection("classes")}
          >
            <div className="d-flex align-items-center justify-content-between mb-3">
              <h5 className="mb-0">My Classes</h5>
              <div className="bg-primary bg-opacity-10 rounded-circle p-2">
                <i className="bi bi-calendar-check fs-4 text-primary"></i>
              </div>
            </div>
            <p className="text-muted mb-0">View your class schedules</p>
          </div>
        </div>

        <div className="col-sm-6 col-lg-3">
          <div
            className="dashboard-card"
            onClick={() => setActiveSection("courses")}
          >
            <div className="d-flex align-items-center justify-content-between mb-3">
              <h5 className="mb-0">My Courses</h5>
              <div className="bg-success bg-opacity-10 rounded-circle p-2">
                <i className="bi bi-book fs-4 text-success"></i>
              </div>
            </div>
            <p className="text-muted mb-0">View your enrolled courses</p>
          </div>
        </div>

        <div className="col-sm-6 col-lg-3">
          <div
            className="dashboard-card"
            onClick={() => setActiveSection("materials")}
          >
            <div className="d-flex align-items-center justify-content-between mb-3">
              <h5 className="mb-0">Resources</h5>
              <div className="bg-warning bg-opacity-10 rounded-circle p-2">
                <i className="bi bi-folder fs-4 text-warning"></i>
              </div>
            </div>
            <p className="text-muted mb-0">Access study materials</p>
          </div>
        </div>

        <div className="col-sm-6 col-lg-3">
          <div className="dashboard-card">
            <div className="d-flex align-items-center justify-content-between mb-3">
              <h5 className="mb-0">Events</h5>
              <div className="bg-danger bg-opacity-10 rounded-circle p-2">
                <i className="bi bi-calendar-event fs-4 text-danger"></i>
              </div>
            </div>
            <p className="text-muted mb-0">View upcoming events</p>
          </div>
        </div>
      </div>

      {/* Student Schedule and Updates */}
      <div className="row">
        <div className="col-lg-7 mb-4 mb-lg-0">
          <div className="dashboard-card">
            <h5 className="mb-4">Today's Schedule</h5>
            {schedulesLoading ? (
              <div className="text-center py-3">
                <div className="spinner-border text-primary" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
                <p className="mt-2 text-muted">Loading your schedule...</p>
              </div>
            ) : schedules.length === 0 ? (
              <div className="text-center py-4">
                <i
                  className="bi bi-calendar-x text-muted"
                  style={{ fontSize: "2rem" }}
                ></i>
                <p className="mt-2 text-muted">
                  No classes scheduled for today
                </p>
              </div>
            ) : (
              <>
                <div className="mb-3 border-start border-primary border-3 ps-3">
                  <h6 className="mb-1">Introduction to Computer Science</h6>
                  <small className="text-muted d-block mb-2">
                    9:00 AM - 10:30 AM
                  </small>
                  <div className="d-flex justify-content-between align-items-center">
                    <span className="badge bg-primary">Room 302</span>
                    <button
                      className="btn btn-sm btn-outline-primary"
                      onClick={() =>
                        handleViewMaterials("Introduction to Computer Science")
                      }
                    >
                      Materials
                    </button>
                  </div>
                </div>

                <div className="mb-3 border-start border-primary border-3 ps-3">
                  <h6 className="mb-1">Mathematics for Engineers</h6>
                  <small className="text-muted d-block mb-2">
                    1:00 PM - 2:30 PM
                  </small>
                  <div className="d-flex justify-content-between align-items-center">
                    <span className="badge bg-primary">Room 201</span>
                    <button
                      className="btn btn-sm btn-outline-primary"
                      onClick={() =>
                        handleViewMaterials("Mathematics for Engineers")
                      }
                    >
                      Materials
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="col-lg-5">
          <div className="dashboard-card">
            <h5 className="mb-4">Campus Updates</h5>
            <div className="update-item mb-3">
              <div className="d-flex">
                <div className="update-icon bg-info bg-opacity-10 text-info">
                  <i className="bi bi-megaphone"></i>
                </div>
                <div className="ms-3">
                  <h6 className="mb-1">Career Fair Next Week</h6>
                  <p className="small text-muted mb-0">
                    Don't miss the opportunity to meet top employers on campus!
                  </p>
                  <small className="text-muted">2 days ago</small>
                </div>
              </div>
            </div>

            <div className="update-item mb-3">
              <div className="d-flex">
                <div className="update-icon bg-warning bg-opacity-10 text-warning">
                  <i className="bi bi-calendar-event"></i>
                </div>
                <div className="ms-3">
                  <h6 className="mb-1">Final Exam Schedule Posted</h6>
                  <p className="small text-muted mb-0">
                    Check the portal for your exam dates and locations.
                  </p>
                  <small className="text-muted">1 week ago</small>
                </div>
              </div>
            </div>

            <div className="update-item">
              <div className="d-flex">
                <div className="update-icon bg-success bg-opacity-10 text-success">
                  <i className="bi bi-book"></i>
                </div>
                <div className="ms-3">
                  <h6 className="mb-1">New Library Resources</h6>
                  <p className="small text-muted mb-0">
                    Additional online resources now available through the
                    library portal.
                  </p>
                  <small className="text-muted">2 weeks ago</small>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // Classes section
  const renderClassesSection = () => (
    <div className="slide-in section-content">
      <div className="section-title mb-4">
        <i className="bi bi-calendar-check"></i>
        My Classes
      </div>

      {/* Class content would go here */}
      <div className="text-center py-5">
        <i className="bi bi-calendar-check fs-1 text-muted"></i>
        <p className="mt-3 text-muted">Your class schedule will appear here</p>
      </div>
    </div>
  );

  // Courses section
  const renderCoursesSection = () => (
    <div className="slide-in section-content">
      <div className="section-title mb-4">
        <i className="bi bi-book"></i>
        My Enrolled Courses
      </div>

      {coursesLoading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-3 text-muted">Loading your courses...</p>
        </div>
      ) : enrolledCourses.length === 0 ? (
        <div className="text-center py-5">
          <i className="bi bi-book fs-1 text-muted"></i>
          <p className="mt-3 text-muted">
            You are not enrolled in any courses yet
          </p>
        </div>
      ) : (
        <div className="card shadow-sm border-0">
          <div className="card-body p-0">
            <div className="table-responsive">
              <table className="table table-hover mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Course</th>
                    <th>Department</th>
                    <th>Level</th>
                    <th>Credits</th>
                    <th>Academic Year</th>
                    <th>Semester</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {enrolledCourses.map((course) => (
                    <tr key={course.id}>
                      <td>
                        <div className="d-flex flex-column">
                          <span className="fw-medium">{course.title}</span>
                          <small className="text-muted">{course.code}</small>
                        </div>
                      </td>
                      <td>{course.department}</td>
                      <td>{course.level}</td>
                      <td>{course.credits}</td>
                      <td>{course.enrollment.academicYear}</td>
                      <td>{course.enrollment.semester}</td>
                      <td>
                        <span
                          className={`badge bg-${
                            course.enrollment.status === "Active"
                              ? "success"
                              : "warning"
                          }`}
                        >
                          {course.enrollment.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // Materials section
  const renderMaterialsSection = () => (
    <div className="slide-in section-content">
      <div className="section-title mb-4">
        <i className="bi bi-folder"></i>
        Learning Materials
      </div>

      {/* Use MaterialsViewer component */}
      <MaterialsViewer role="student" />
    </div>
  );

  // Profile section
  const renderProfileSection = () => (
    <div className="slide-in section-content">
      <div className="section-title mb-4">
        <i className="bi bi-person-circle"></i>
        Profile Management
      </div>

      {profileLoading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-3 text-muted">Loading your profile...</p>
        </div>
      ) : isEditing ? (
        <form
          onSubmit={handleUpdateProfile}
          className="profile-edit-form"
          style={{
            width: "100%",
            maxHeight: "calc(100vh - 180px)",
            overflowY: "auto",
            paddingRight: "10px",
          }}
        >
          <div className="row">
            <div className="col-md-4 mb-4 text-center">
              <div
                className="position-relative mx-auto"
                style={{ width: "150px", height: "150px" }}
              >
                {profileImage ? (
                  <img
                    src={profileImage}
                    alt="Profile"
                    className="rounded-circle img-thumbnail"
                    style={{
                      width: "150px",
                      height: "150px",
                      objectFit: "cover",
                    }}
                  />
                ) : (
                  <div
                    className="rounded-circle bg-primary bg-opacity-10 d-flex align-items-center justify-content-center"
                    style={{ width: "150px", height: "150px" }}
                  >
                    <i
                      className="bi bi-person-fill text-primary"
                      style={{ fontSize: "4rem" }}
                    ></i>
                  </div>
                )}
                <div
                  className="position-absolute bottom-0 end-0 bg-white rounded-circle p-2 shadow-sm"
                  style={{ cursor: "pointer" }}
                >
                  <i className="bi bi-camera text-primary"></i>
                </div>
              </div>

              <div className="mt-3">
                <input
                  type="text"
                  className="form-control"
                  placeholder="Image URL"
                  value={profileImage}
                  onChange={(e) => setProfileImage(e.target.value)}
                />
                <small className="text-muted">
                  Enter image URL for profile
                </small>
              </div>
            </div>

            <div className="col-md-8">
              <div className="card border-0 shadow-sm mb-4">
                <div className="card-body p-3">
                  <h6 className="card-title mb-3">
                    <i className="bi bi-person-badge me-2 text-primary"></i>
                    Personal Information
                  </h6>

                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <label className="form-label small text-muted">
                        Full Name
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                      />
                    </div>

                    <div className="col-md-6 mb-3">
                      <label className="form-label small text-muted">
                        Email Address
                      </label>
                      <input
                        type="email"
                        className="form-control bg-light"
                        value={email}
                        disabled
                        readOnly
                      />
                      <small className="text-muted">
                        Email cannot be changed
                      </small>
                    </div>
                  </div>

                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <label className="form-label small text-muted">
                        Role
                      </label>
                      <input
                        type="text"
                        className="form-control bg-light"
                        value={role}
                        disabled
                        readOnly
                      />
                      <small className="text-muted">
                        Role cannot be changed
                      </small>
                    </div>

                    <div className="col-md-6 mb-3">
                      <label className="form-label small text-muted">
                        Phone Number
                      </label>
                      <input
                        type="tel"
                        className="form-control"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="e.g., +1234567890"
                      />
                    </div>
                  </div>

                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <label className="form-label small text-muted">Age</label>
                      <input
                        type="number"
                        className="form-control"
                        value={age}
                        onChange={(e) => setAge(e.target.value)}
                        min="16"
                        max="100"
                        placeholder="e.g., 20"
                      />
                    </div>

                    <div className="col-md-6 mb-3">
                      <label className="form-label small text-muted">
                        Address
                      </label>
                      <textarea
                        className="form-control"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        rows={2}
                        placeholder="Enter your address"
                      ></textarea>
                    </div>
                  </div>
                </div>
              </div>

              <div className="d-flex justify-content-end gap-2">
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={() => setIsEditing(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </form>
      ) : (
        <div className="profile-view">
          <div className="d-flex justify-content-end mb-4">
            <button
              className="btn btn-primary"
              onClick={() => setIsEditing(true)}
            >
              <i className="bi bi-pencil me-2"></i> Edit Profile
            </button>
          </div>

          <div className="card border-0 shadow-sm mb-4">
            <div className="card-body p-0">
              <div className="row g-0">
                <div className="col-md-4 text-center p-4 border-end">
                  <div className="profile-image-container mx-auto mb-3">
                    {profileImage ? (
                      <img
                        src={profileImage}
                        alt="Profile"
                        className="rounded-circle img-thumbnail shadow"
                        style={{
                          width: "150px",
                          height: "150px",
                          objectFit: "cover",
                        }}
                      />
                    ) : (
                      <div
                        className="rounded-circle bg-primary bg-opacity-10 d-flex align-items-center justify-content-center shadow"
                        style={{
                          width: "150px",
                          height: "150px",
                          margin: "0 auto",
                        }}
                      >
                        <i
                          className="bi bi-person-fill text-primary"
                          style={{ fontSize: "4rem" }}
                        ></i>
                      </div>
                    )}
                  </div>

                  <h4 className="mb-1">{name || "Not set"}</h4>
                  <p className="text-muted">{email || "Not set"}</p>
                  <span className="badge bg-primary mb-3">{role}</span>

                  <div className="progress mb-2 mt-4" style={{ height: "8px" }}>
                    <div
                      className="progress-bar bg-success"
                      role="progressbar"
                      style={{
                        width: `${
                          ([
                            name,
                            email,
                            role,
                            age,
                            phone,
                            address,
                            profileImage,
                          ].filter(Boolean).length *
                            100) /
                          7
                        }%`,
                      }}
                      aria-valuenow={
                        ([
                          name,
                          email,
                          role,
                          age,
                          phone,
                          address,
                          profileImage,
                        ].filter(Boolean).length *
                          100) /
                        7
                      }
                      aria-valuemin={0}
                      aria-valuemax={100}
                    ></div>
                  </div>
                  <p className="small text-muted mb-0">
                    Profile Completion:{" "}
                    {Math.round(
                      ([
                        name,
                        email,
                        role,
                        age,
                        phone,
                        address,
                        profileImage,
                      ].filter(Boolean).length *
                        100) /
                        7
                    )}
                    %
                  </p>
                </div>

                <div className="col-md-8 p-4">
                  <h5 className="border-bottom pb-2 mb-4">
                    Personal Information
                  </h5>

                  <div className="row mb-4">
                    <div className="col-md-6">
                      <div className="profile-detail">
                        <div className="profile-detail-label">
                          <i className="bi bi-person me-2 text-primary"></i>Full
                          Name
                        </div>
                        <div className="profile-detail-value fw-medium">
                          {name || "Not set"}
                        </div>
                      </div>
                    </div>

                    <div className="col-md-6">
                      <div className="profile-detail">
                        <div className="profile-detail-label">
                          <i className="bi bi-envelope me-2 text-primary"></i>
                          Email
                        </div>
                        <div className="profile-detail-value fw-medium">
                          {email || "Not set"}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="row mb-4">
                    <div className="col-md-6">
                      <div className="profile-detail">
                        <div className="profile-detail-label">
                          <i className="bi bi-person-badge me-2 text-primary"></i>
                          Role
                        </div>
                        <div className="profile-detail-value fw-medium">
                          {role || "Not set"}
                        </div>
                      </div>
                    </div>

                    <div className="col-md-6">
                      <div className="profile-detail">
                        <div className="profile-detail-label">
                          <i className="bi bi-telephone me-2 text-primary"></i>
                          Phone
                        </div>
                        <div className="profile-detail-value fw-medium">
                          {phone || "Not set"}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="row">
                    <div className="col-md-6">
                      <div className="profile-detail">
                        <div className="profile-detail-label">
                          <i className="bi bi-calendar me-2 text-primary"></i>
                          Age
                        </div>
                        <div className="profile-detail-value fw-medium">
                          {age || "Not set"}
                        </div>
                      </div>
                    </div>

                    <div className="col-md-6">
                      <div className="profile-detail">
                        <div className="profile-detail-label">
                          <i className="bi bi-geo-alt me-2 text-primary"></i>
                          Address
                        </div>
                        <div className="profile-detail-value fw-medium">
                          {address || "Not set"}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="card border-0 shadow-sm">
            <div className="card-body">
              <h5 className="card-title mb-3">
                <i className="bi bi-shield-check text-primary me-2"></i>
                Account Security
              </h5>
              <p className="text-muted mb-0">
                Your account is secure. Remember to keep your password
                confidential and update it regularly.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // Chat Section
  const renderChatSection = () => (
    <div className="slide-in section-content">
      <div className="section-title mb-4">
        <i className="bi bi-chat-dots"></i>
        Course Chat
      </div>
      <div className="row">
        <div className="col-md-12">
          <div className="card h-100">
            <div className="card-body p-0">
              <ChatInterface />
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // Schedule Section
  const renderScheduleSection = () => (
    <div className="slide-in section-content">
      <div className="section-title mb-4">
        <i className="bi bi-calendar3"></i>
        Class Schedule
      </div>
      <div className="row">
        <div className="col-12">
          <div className="dashboard-card">
            <div className="table-responsive">
              <table className="table table-hover">
                <thead className="table-light">
                  <tr>
                    <th>Course</th>
                    <th>Day</th>
                    <th>Time</th>
                    <th>Location</th>
                    <th>Lecturer</th>
                  </tr>
                </thead>
                <tbody>
                  {schedules.map((schedule, index) => (
                    <tr key={index}>
                      <td>{schedule.moduleTitle}</td>
                      <td>{schedule.dayOfWeek}</td>
                      <td>
                        {schedule.startTime} - {schedule.endTime}
                      </td>
                      <td>
                        Floor {schedule.floorNumber}, Room{" "}
                        {schedule.classroomNumber}
                      </td>
                      <td>{schedule.lecturerName}</td>
                    </tr>
                  ))}
                  {schedules.length === 0 && (
                    <tr>
                      <td colSpan={5} className="text-center py-4">
                        {schedulesLoading ? (
                          <div>
                            <div
                              className="spinner-border spinner-border-sm text-primary me-2"
                              role="status"
                            >
                              <span className="visually-hidden">
                                Loading...
                              </span>
                            </div>
                            Loading schedule...
                          </div>
                        ) : (
                          "No schedules found"
                        )}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // Grades Section
  const renderGradesSection = () => (
    <div className="slide-in section-content">
      <div className="section-title mb-4">
        <i className="bi bi-award"></i>
        Grades
      </div>
      <div className="row">
        <div className="col-12">
          <div className="dashboard-card">
            <div className="table-responsive">
              <table className="table table-hover">
                <thead className="table-light">
                  <tr>
                    <th>Course</th>
                    <th>Assignment</th>
                    <th>Score</th>
                    <th>Grade</th>
                    <th>Feedback</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Introduction to Programming</td>
                    <td>Project 1</td>
                    <td>85/100</td>
                    <td>B</td>
                    <td>
                      <button className="btn btn-sm btn-outline-primary">
                        View
                      </button>
                    </td>
                  </tr>
                  <tr>
                    <td>Web Development</td>
                    <td>Midterm Exam</td>
                    <td>92/100</td>
                    <td>A</td>
                    <td>
                      <button className="btn btn-sm btn-outline-primary">
                        View
                      </button>
                    </td>
                  </tr>
                  <tr>
                    <td>Database Systems</td>
                    <td>Quiz 1</td>
                    <td>78/100</td>
                    <td>C</td>
                    <td>
                      <button className="btn btn-sm btn-outline-primary">
                        View
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // Main component render
  return (
    <div className="admin-layout">
      {/* Sidebar */}
      <div
        className={`admin-sidebar ${
          sidebarCollapsed ? "admin-sidebar-collapsed" : ""
        } ${mobileOpen ? "admin-sidebar-visible" : ""}`}
      >
        <div className="admin-sidebar-header">
          <div className="admin-logo-container">
            <img src={logoUrl} alt="SCMS Logo" className="admin-logo-image" />
            <div className="admin-logo-text">SCMS</div>
          </div>
          {/* Mobile only close button */}
          <button
            className="toggle-sidebar d-block d-lg-none"
            onClick={toggleMobileSidebar}
          >
            <i className="bi bi-x-lg"></i>
          </button>
        </div>

        <div className="admin-sidebar-body">
          {/* Sidebar Menu Items */}
          <div className="admin-menu">
            <div
              className={`admin-menu-item ${
                activeSection === "dashboard" ? "active" : ""
              }`}
              onClick={() => setActiveSection("dashboard")}
            >
              <i className="bi bi-speedometer2"></i>
              <span>Dashboard</span>
            </div>
            <div
              className={`admin-menu-item ${
                activeSection === "classes" ? "active" : ""
              }`}
              onClick={() => setActiveSection("classes")}
            >
              <i className="bi bi-calendar-check"></i>
              <span>My Classes</span>
            </div>
            <div
              className={`admin-menu-item ${
                activeSection === "courses" ? "active" : ""
              }`}
              onClick={() => setActiveSection("courses")}
            >
              <i className="bi bi-book"></i>
              <span>My Courses</span>
            </div>
            <div
              className={`admin-menu-item ${
                activeSection === "materials" ? "active" : ""
              }`}
              onClick={() => setActiveSection("materials")}
            >
              <i className="bi bi-folder"></i>
              <span>Materials</span>
            </div>
            <div
              className={`admin-menu-item ${
                activeSection === "chat" ? "active" : ""
              }`}
              onClick={() => setActiveSection("chat")}
            >
              <i className="bi bi-chat-dots"></i>
              <span>Course Chat</span>
            </div>
            <div
              className={`admin-menu-item ${
                activeSection === "profile" ? "active" : ""
              }`}
              onClick={() => setActiveSection("profile")}
            >
              <i className="bi bi-person-circle"></i>
              <span>Profile</span>
            </div>
          </div>
        </div>

        <div className="admin-sidebar-footer">
          {/* Toggle button above logout */}
          <div className="toggle-button-footer" onClick={toggleSidebar}>
            <i
              className={`bi ${
                sidebarCollapsed ? "bi-chevron-right" : "bi-chevron-left"
              }`}
            ></i>
            <span>Collapse Menu</span>
          </div>

          <div className="admin-menu-item logout-button" onClick={handleLogout}>
            <i className="bi bi-box-arrow-right"></i>
            <span>Logout</span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div
        className={`admin-content ${
          sidebarCollapsed ? "admin-content-expanded" : ""
        }`}
      >
        {/* Mobile Header */}
        <div className="d-lg-none mb-3 d-flex justify-content-between align-items-center">
          <button
            className="btn btn-outline-primary"
            onClick={toggleMobileSidebar}
          >
            <i className="bi bi-list"></i>
          </button>
          <div className="dashboard-logo">SCMS</div>
          <div className="dropdown">
            <button
              className="btn btn-outline-secondary dropdown-toggle"
              type="button"
              id="userDropdown"
              data-bs-toggle="dropdown"
              aria-expanded="false"
            >
              <i className="bi bi-person-circle"></i>
            </button>
            <ul
              className="dropdown-menu dropdown-menu-end"
              aria-labelledby="userDropdown"
            >
              <li>
                <button
                  className="dropdown-item"
                  onClick={() => setActiveSection("profile")}
                >
                  Profile
                </button>
              </li>
              <li>
                <button className="dropdown-item" onClick={handleLogout}>
                  Logout
                </button>
              </li>
            </ul>
          </div>
        </div>

        {/* Success/Error Alerts */}
        {error && (
          <div
            className="alert alert-danger mb-4 alert-dismissible fade show"
            role="alert"
          >
            {error}
            <button
              type="button"
              className="btn-close"
              onClick={() => setError("")}
            ></button>
          </div>
        )}

        {success && (
          <div
            className="alert alert-success mb-4 alert-dismissible fade show"
            role="alert"
          >
            {success}
            <button
              type="button"
              className="btn-close"
              onClick={() => setSuccess("")}
            ></button>
          </div>
        )}

        {/* Welcome header */}
        <div className="mb-4">
          <h1 className="h3 fw-bold">Welcome, {userData?.name || "Student"}</h1>
          <p className="text-muted">
            Manage your classes, access learning materials, and participate in
            campus activities.
          </p>
        </div>

        {/* Container for dynamic content */}
        <div className="content-container">{renderContent()}</div>
      </div>
    </div>
  );
}
