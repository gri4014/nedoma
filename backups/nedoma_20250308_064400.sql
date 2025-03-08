--
-- PostgreSQL database dump
--

-- Dumped from database version 14.17 (Debian 14.17-1.pgdg120+1)
-- Dumped by pg_dump version 14.15 (Homebrew)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- Name: swipe_direction; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.swipe_direction AS ENUM (
    'left',
    'right',
    'up'
);


ALTER TYPE public.swipe_direction OWNER TO postgres;

--
-- Name: cleanup_expired_sessions(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.cleanup_expired_sessions() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  DELETE FROM sessions WHERE expires_at < NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION public.cleanup_expired_sessions() OWNER TO postgres;

--
-- Name: update_event_tags_updated_at(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_event_tags_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_event_tags_updated_at() OWNER TO postgres;

--
-- Name: update_events_updated_at(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_events_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_events_updated_at() OWNER TO postgres;

--
-- Name: update_last_active_at(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_last_active_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.last_active_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_last_active_at() OWNER TO postgres;

--
-- Name: update_timestamp(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_timestamp() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_timestamp() OWNER TO postgres;

--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_updated_at_column() OWNER TO postgres;

--
-- Name: validate_event_subcategories(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.validate_event_subcategories() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- Check if all subcategories exist in categories table
    IF EXISTS (
        SELECT 1
        FROM unnest(NEW.subcategories) AS subcategory_id
        LEFT JOIN categories ON categories.id = subcategory_id
        WHERE categories.id IS NULL
    ) THEN
        RAISE EXCEPTION 'Invalid subcategory ID found';
    END IF;
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.validate_event_subcategories() OWNER TO postgres;

--
-- Name: validate_event_tag(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.validate_event_tag() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    tag_type_val tag_type;
    possible_values_arr TEXT[];
    tag_subcategories UUID[];
    event_subcategories UUID[];
BEGIN
    -- Get tag info
    SELECT type, possible_values, subcategories INTO tag_type_val, possible_values_arr, tag_subcategories
    FROM tags WHERE id = NEW.tag_id;
    
    -- Get event subcategories
    SELECT subcategories INTO event_subcategories
    FROM events WHERE id = NEW.event_id;
    
    -- Validate tag values based on type
    IF tag_type_val = 'boolean' THEN
        IF array_length(NEW.tag_values, 1) != 1 OR NEW.tag_values[1] NOT IN ('true', 'false') THEN
            RAISE EXCEPTION 'Boolean tag must have exactly one value: true or false';
        END IF;
    ELSIF tag_type_val = 'categorical' AND possible_values_arr IS NOT NULL THEN
        IF NOT (SELECT bool_and(val = ANY(possible_values_arr)) FROM unnest(NEW.tag_values) AS val) THEN
            RAISE EXCEPTION 'Categorical tag values must be from the possible values list';
        END IF;
    END IF;
    
    -- Validate that tag is applicable to at least one of event's subcategories
    IF NOT (
        SELECT EXISTS (
            SELECT 1 
            FROM unnest(event_subcategories) AS event_subcat
            WHERE event_subcat = ANY(tag_subcategories)
        )
    ) THEN
        RAISE EXCEPTION 'Tag is not applicable to any of the event subcategories';
    END IF;
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.validate_event_tag() OWNER TO postgres;

--
-- Name: validate_event_tag_values(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.validate_event_tag_values() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    valid_values TEXT[];
BEGIN
    -- Get possible values for the tag
    SELECT possible_values INTO valid_values
    FROM tags WHERE id = NEW.tag_id;
    
    -- Check if all selected values are valid
    IF NOT (SELECT bool_and(val = ANY(valid_values)) 
            FROM unnest(NEW.selected_values) AS val) THEN
        RAISE EXCEPTION 'All selected values must be from the tag''s possible values';
    END IF;
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.validate_event_tag_values() OWNER TO postgres;

--
-- Name: validate_subcategory_reference(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.validate_subcategory_reference() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM categories
        WHERE id = NEW.subcategory_id AND parent_id IS NOT NULL
    ) THEN
        RAISE EXCEPTION 'Invalid subcategory: must reference a category with a parent';
    END IF;
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.validate_subcategory_reference() OWNER TO postgres;

--
-- Name: validate_tag_values(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.validate_tag_values() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    possible_values_arr TEXT[];
BEGIN
    -- Get possible values for this tag
    SELECT possible_values INTO possible_values_arr
    FROM tags WHERE id = NEW.tag_id;
    
    -- Check if all selected values are in the possible values array
    IF NOT (SELECT bool_and(val = ANY(possible_values_arr))
            FROM unnest(NEW.selected_values) AS val) THEN
        RAISE EXCEPTION 'Invalid tag values. Values must be among the tag''s possible values.';
    END IF;
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.validate_tag_values() OWNER TO postgres;

--
-- Name: validate_user_tag_preference(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.validate_user_tag_preference() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    tag_type_val tag_type;
    possible_values_arr TEXT[];
BEGIN
    SELECT type, possible_values INTO tag_type_val, possible_values_arr
    FROM tags WHERE id = NEW.tag_id;
    
    IF tag_type_val = 'boolean' THEN
        IF NEW.value NOT IN ('true', 'false') THEN
            RAISE EXCEPTION 'Boolean tag value must be either "true" or "false"';
        END IF;
    ELSIF tag_type_val = 'categorical' THEN
        IF NOT (NEW.value = ANY(possible_values_arr)) THEN
            RAISE EXCEPTION 'Categorical tag value must be one of the possible values';
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.validate_user_tag_preference() OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: admins; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.admins (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    login character varying(255) NOT NULL,
    password_hash text NOT NULL,
    last_login timestamp without time zone,
    is_active boolean DEFAULT true,
    role character varying(20) DEFAULT 'ADMIN'::character varying NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.admins OWNER TO postgres;

--
-- Name: categories; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.categories (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name text NOT NULL,
    parent_id uuid,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    is_active boolean DEFAULT true NOT NULL,
    display_order integer DEFAULT 0 NOT NULL
);


ALTER TABLE public.categories OWNER TO postgres;

--
-- Name: event_tags; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.event_tags (
    event_id uuid NOT NULL,
    tag_id uuid NOT NULL,
    selected_values text[] DEFAULT '{}'::text[] NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.event_tags OWNER TO postgres;

--
-- Name: events; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    short_description text NOT NULL,
    long_description text,
    image_urls text[] DEFAULT '{}'::text[],
    links text[] DEFAULT '{}'::text[],
    event_dates timestamp with time zone[] NOT NULL,
    address text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    is_free boolean DEFAULT true NOT NULL,
    price_range jsonb,
    subcategories uuid[] DEFAULT '{}'::uuid[] NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    display_dates boolean DEFAULT true NOT NULL,
    CONSTRAINT short_description_length_check CHECK ((length(short_description) <= 160))
);


ALTER TABLE public.events OWNER TO postgres;

--
-- Name: migrations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.migrations (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    executed_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.migrations OWNER TO postgres;

--
-- Name: migrations_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.migrations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.migrations_id_seq OWNER TO postgres;

--
-- Name: migrations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.migrations_id_seq OWNED BY public.migrations.id;


--
-- Name: sessions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.sessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    token text NOT NULL,
    expires_at timestamp without time zone NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.sessions OWNER TO postgres;

--
-- Name: subcategories; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.subcategories (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name text NOT NULL,
    category_id uuid,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    display_order integer DEFAULT 0 NOT NULL
);


ALTER TABLE public.subcategories OWNER TO postgres;

--
-- Name: swipes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.swipes (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid,
    event_id uuid,
    direction public.swipe_direction NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.swipes OWNER TO postgres;

--
-- Name: tag_subcategories; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.tag_subcategories (
    tag_id uuid NOT NULL,
    subcategory_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.tag_subcategories OWNER TO postgres;

--
-- Name: tags; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.tags (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name text NOT NULL,
    possible_values text[] DEFAULT '{}'::text[] NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    subcategories uuid[] DEFAULT '{}'::uuid[]
);


ALTER TABLE public.tags OWNER TO postgres;

--
-- Name: tags_categories; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.tags_categories (
    tag_id uuid NOT NULL,
    category_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.tags_categories OWNER TO postgres;

--
-- Name: user_category_preferences; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_category_preferences (
    id integer NOT NULL,
    user_id uuid,
    subcategory_id uuid,
    level integer NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT user_category_preferences_level_check CHECK (((level >= 0) AND (level <= 2)))
);


ALTER TABLE public.user_category_preferences OWNER TO postgres;

--
-- Name: user_category_preferences_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.user_category_preferences_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.user_category_preferences_id_seq OWNER TO postgres;

--
-- Name: user_category_preferences_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.user_category_preferences_id_seq OWNED BY public.user_category_preferences.id;


--
-- Name: user_tag_preferences; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_tag_preferences (
    id integer NOT NULL,
    user_id uuid,
    tag_id uuid,
    selected_values text[] DEFAULT '{}'::text[] NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.user_tag_preferences OWNER TO postgres;

--
-- Name: user_tag_preferences_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.user_tag_preferences_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.user_tag_preferences_id_seq OWNER TO postgres;

--
-- Name: user_tag_preferences_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.user_tag_preferences_id_seq OWNED BY public.user_tag_preferences.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    telegram_id bigint NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    temp_id uuid DEFAULT public.uuid_generate_v4(),
    last_active_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.users OWNER TO postgres;

--
-- Name: migrations id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.migrations ALTER COLUMN id SET DEFAULT nextval('public.migrations_id_seq'::regclass);


--
-- Name: user_category_preferences id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_category_preferences ALTER COLUMN id SET DEFAULT nextval('public.user_category_preferences_id_seq'::regclass);


--
-- Name: user_tag_preferences id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_tag_preferences ALTER COLUMN id SET DEFAULT nextval('public.user_tag_preferences_id_seq'::regclass);


--
-- Data for Name: admins; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.admins (id, login, password_hash, last_login, is_active, role, created_at, updated_at) FROM stdin;
b333f25e-b064-47f3-b748-a7e0f7d93ec5	admin	$2b$10$3IXhqHgGZnxTXgLJJcJ8L.Ld9Qz7gkO7OHvwxvhxvyWtGDGrwykPi	2025-03-08 08:11:18.714575	t	ADMIN	2025-03-07 22:49:30.695563	2025-03-08 08:11:18.714575
\.


--
-- Data for Name: categories; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.categories (id, name, parent_id, created_at, updated_at, is_active, display_order) FROM stdin;
c13a5b81-1e73-4152-bde9-0da918f0639b	Бои	d290f1ee-6c54-4b01-90e6-d701748f0851	2025-03-07 22:47:31.973885+00	2025-03-07 22:49:30.706266+00	t	10
52bac3f3-dedb-40b1-9b78-fb3af134a6ea	Игровой досуг	d290f1ee-6c54-4b01-90e6-d701748f0853	2025-03-07 22:47:31.973885+00	2025-03-07 22:49:30.706266+00	t	10
223639e5-fa9b-40b2-9eb1-19c6311a6526	Кино	d290f1ee-6c54-4b01-90e6-d701748f0852	2025-03-07 22:47:31.973885+00	2025-03-07 22:49:30.706266+00	t	10
5712a50f-50a9-4d53-868c-6d8e7f23b20a	Клубы, бары, рюмочные	d290f1ee-6c54-4b01-90e6-d701748f0853	2025-03-07 22:47:31.973885+00	2025-03-07 22:49:30.706266+00	t	10
a1f78ab2-3583-470e-87b3-62c167b9650b	Концерты	d290f1ee-6c54-4b01-90e6-d701748f0852	2025-03-07 22:47:31.973885+00	2025-03-07 22:49:30.706266+00	t	10
d290f1ee-6c54-4b01-90e6-d701748f0852	Культура	\N	2025-03-07 22:47:31.973885+00	2025-03-07 22:49:30.706266+00	t	10
d290f1ee-6c54-4b01-90e6-d701748f0853	Развлечения	\N	2025-03-07 22:47:31.973885+00	2025-03-07 22:49:30.706266+00	t	10
b5a85484-ac8a-4585-81e4-a40b17b7009f	Рестораны, кафе	d290f1ee-6c54-4b01-90e6-d701748f0853	2025-03-07 22:47:31.973885+00	2025-03-07 22:49:30.706266+00	t	10
d290f1ee-6c54-4b01-90e6-d701748f0851	Спорт	\N	2025-03-07 22:47:31.973885+00	2025-03-07 22:49:30.706266+00	t	10
71c42e85-0c70-45e7-a589-763764e3dfdc	Стендапы	d290f1ee-6c54-4b01-90e6-d701748f0852	2025-03-07 22:47:31.973885+00	2025-03-07 22:49:30.706266+00	t	10
04872cbe-1f38-401b-adfd-b2fca1826b63	Театры	d290f1ee-6c54-4b01-90e6-d701748f0852	2025-03-07 22:47:31.973885+00	2025-03-07 22:49:30.706266+00	t	10
e9b9553e-61f2-490d-a74b-a7418ea67477	Теннис	d290f1ee-6c54-4b01-90e6-d701748f0851	2025-03-07 22:47:31.973885+00	2025-03-07 22:49:30.706266+00	t	10
65de3567-219b-490b-93d8-2b78c9c282c3	Футбол	d290f1ee-6c54-4b01-90e6-d701748f0851	2025-03-07 22:47:31.973885+00	2025-03-07 22:49:30.706266+00	t	10
1e17985c-079f-4ed1-adfa-1f8f323265c3	Хоккей	d290f1ee-6c54-4b01-90e6-d701748f0851	2025-03-07 22:47:31.973885+00	2025-03-07 22:49:30.706266+00	t	10
\.


--
-- Data for Name: event_tags; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.event_tags (event_id, tag_id, selected_values, created_at, updated_at) FROM stdin;
a7ced472-3a4a-43db-ba04-0a8c1cd2a7bb	3c279c2a-e3a6-43c8-90f6-fcf8582a3108	{"классическая музыка"}	2025-03-08 07:52:40.106058+00	2025-03-08 07:52:40.106058+00
82ecf0f5-8920-4291-a020-4a0b2d7f39e1	f23b5a14-bda5-4f74-954f-9a8a2eeb471a	{приключения}	2025-03-08 07:55:19.287791+00	2025-03-08 07:55:19.287791+00
7d1cf336-6c1b-495c-87ed-a8504a1ffda4	f23b5a14-bda5-4f74-954f-9a8a2eeb471a	{драма}	2025-03-08 11:05:27.517202+00	2025-03-08 11:05:27.517202+00
e3d0615c-ac7f-4ad7-b870-2cea6eb731df	3c279c2a-e3a6-43c8-90f6-fcf8582a3108	{рок}	2025-03-08 11:16:51.475641+00	2025-03-08 11:16:51.475641+00
583496cb-7f1f-42b7-8c60-8a65e3350416	f23b5a14-bda5-4f74-954f-9a8a2eeb471a	{драма}	2025-03-08 11:24:18.579791+00	2025-03-08 11:24:18.579791+00
\.


--
-- Data for Name: events; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.events (id, name, short_description, long_description, image_urls, links, event_dates, address, is_active, is_free, price_range, subcategories, created_at, updated_at, display_dates) FROM stdin;
82ecf0f5-8920-4291-a020-4a0b2d7f39e1	Царевна-лягушка	В пруду городского парка жила-была лягушка, которая очень любила смотреть фильмы в летнем кинотеатре.	В пруду городского парка жила-была лягушка, которая очень любила смотреть фильмы в летнем кинотеатре.	{http://localhost:3002/uploads/events/1741420519239-1741420519228-922731298.png}	{}	{}	Кинотеатры	t	f	{"max": 5000, "min": 200}	{223639e5-fa9b-40b2-9eb1-19c6311a6526}	2025-03-08 07:55:19.31+00	2025-03-08 07:55:19.31+00	t
7d1cf336-6c1b-495c-87ed-a8504a1ffda4	gfhjdejhghjkw	hfudisuyhfu	hfudisuyhfu	{http://localhost:3002/uploads/events/1741431927475-1741431927461-145259812.png}	{}	{"2025-03-08 11:05:14.336+00"}	1	t	f	{"max": 700, "min": 700}	{223639e5-fa9b-40b2-9eb1-19c6311a6526}	2025-03-08 11:05:27.564+00	2025-03-08 11:05:27.564+00	t
e3d0615c-ac7f-4ad7-b870-2cea6eb731df	1	1	1	{http://localhost:3002/uploads/events/1741432611417-1741432611409-761601896.png}	{}	{}	1	t	f	{"max": 800, "min": 800}	{a1f78ab2-3583-470e-87b3-62c167b9650b}	2025-03-08 11:16:51.49+00	2025-03-08 11:16:51.49+00	t
583496cb-7f1f-42b7-8c60-8a65e3350416	1	1	1	{http://localhost:3002/uploads/events/1741433058494-1741433058483-398090113.png}	{}	{}	1	t	f	{"max": 800, "min": 800}	{223639e5-fa9b-40b2-9eb1-19c6311a6526}	2025-03-08 11:24:18.618+00	2025-03-08 11:24:18.618+00	t
a7ced472-3a4a-43db-ba04-0a8c1cd2a7bb	Орган при свечах	Приглашаем вас на уникальный органный концерт, который пройдет при свечах в концертном зале Государственного музея А.С. Пушкина	Приглашаем вас на уникальный органный концерт, который пройдет при свечах в концертном зале Государственного музея А.С. Пушкина	{http://localhost:3002/uploads/events/1741420360072-1741420360044-27988435.png}	{}	{"2025-03-08 07:52:15.316+00"}	1	t	f	{"max": 15000, "min": 800}	{a1f78ab2-3583-470e-87b3-62c167b9650b}	2025-03-08 07:52:40.139+00	2025-03-08 11:43:24.043578+00	f
\.


--
-- Data for Name: migrations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.migrations (id, name, executed_at) FROM stdin;
1	000_create_extensions.sql	2025-03-07 22:49:30.561134
2	001_create_update_function.sql	2025-03-07 22:49:30.569466
3	001_create_update_timestamp_function.sql	2025-03-07 22:49:30.589723
4	002_create_users_table.sql	2025-03-07 22:49:30.591027
5	002a_create_users_table.sql	2025-03-07 22:49:30.617638
6	003_create_categories_table.sql	2025-03-07 22:49:30.619385
7	004_create_events_table.sql	2025-03-07 22:49:30.635412
8	004a_create_events_indexes.sql	2025-03-07 22:49:30.647639
9	005_create_tags_table.sql	2025-03-07 22:49:30.669276
10	008_create_admin_table.sql	2025-03-07 22:49:30.686845
11	009_create_swipes_and_preferences.sql	2025-03-07 22:49:30.692735
12	010_add_initial_admin.sql	2025-03-07 22:49:30.695563
13	011_create_sessions_table.sql	2025-03-07 22:49:30.704526
14	012_add_category_columns.sql	2025-03-07 22:49:30.706266
15	013_update_tags_for_multiple_categories.sql	2025-03-07 22:49:30.715159
16	014_add_is_active_to_tags.sql	2025-03-07 22:49:30.718527
17	015_fix_tag_categories_trigger.sql	2025-03-07 22:49:30.720933
18	016_fix_tags_structure.sql	2025-03-07 22:49:30.726436
19	016_remove_tag_categories_trigger.sql	2025-03-07 22:49:30.727979
20	017_add_tag_category_validation.sql	2025-03-07 22:49:30.730271
21	017_fix_tags_columns.sql	2025-03-07 22:49:30.770326
22	018_add_tag_categories_constraints.sql	2025-03-07 22:49:30.771916
23	019_remove_tag_categories.sql	2025-03-07 22:49:30.775204
24	020_fix_event_columns.sql	2025-03-07 22:49:30.802068
25	021_fix_event_tags.sql	2025-03-07 22:49:30.823417
26	021_update_tag_system.sql	2025-03-07 22:49:30.831337
27	022_add_event_subcategories.sql	2025-03-07 22:49:30.833738
28	023_setup_event_tags.sql	2025-03-07 22:49:30.855414
29	024_create_events_table.sql	2025-03-07 22:49:30.878634
30	025_add_device_id_to_users.sql	2025-03-07 22:49:30.913515
31	025_create_users_with_device_id.sql	2025-03-07 22:49:30.91632
32	026_modify_users_table.sql	2025-03-07 22:49:30.923903
33	028_update_subcategory_names.sql	2025-03-07 22:49:30.927035
34	029_revert_subcategory_names.sql	2025-03-07 22:49:30.934847
35	030_add_tag_subcategories.sql	2025-03-07 22:49:30.948599
36	031_create_subcategories_table.sql	2025-03-07 22:49:30.952345
37	031_fix_event_tags_table.sql	2025-03-07 22:49:30.967834
38	031a_update_tag_system.sql	2025-03-07 22:49:30.987963
39	032_simplify_users_table.sql	2025-03-07 22:49:31.014454
40	033_create_tag_preferences.sql	2025-03-07 22:49:31.018052
41	034_sync_user_preferences.sql	2025-03-07 22:49:31.05411
42	034a_add_tag_validation.sql	2025-03-07 22:49:31.059896
43	035_fix_user_id_types.sql	2025-03-07 22:49:31.081678
44	036_update_preferences_table.sql	2025-03-07 22:49:31.085644
45	036_update_preferences_to_use_subcategories.sql	2025-03-07 22:49:31.089084
46	037_fix_preferences_foreign_key.sql	2025-03-07 22:49:31.094022
47	038_rename_preference_level_column.sql	2025-03-07 22:49:31.09768
48	039_add_subcategory_display_order.sql	2025-03-07 22:49:31.102587
49	039_fix_preferences_column_and_constraints.sql	2025-03-07 22:49:31.10672
50	040_fix_preferences_table_structure.sql	2025-03-07 22:49:31.123003
51	040_update_level_constraint.sql	2025-03-07 22:49:31.127942
52	041_remove_is_active_from_subcategories.sql	2025-03-07 22:49:31.131332
53	042_add_display_order_to_subcategories.sql	2025-03-07 22:49:31.135122
54	041_fix_category_preferences_fk.sql	2025-03-07 23:06:26.661842
55	043_update_events_for_optional_dates.sql	2025-03-08 06:45:55.910787
56	044_make_long_description_optional.sql	2025-03-08 06:55:55.433651
57	045_limit_short_description_length.sql	2025-03-08 07:04:06.748537
\.


--
-- Data for Name: sessions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.sessions (id, user_id, token, expires_at, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: subcategories; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.subcategories (id, name, category_id, created_at, updated_at, display_order) FROM stdin;
\.


--
-- Data for Name: swipes; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.swipes (id, user_id, event_id, direction, created_at, updated_at) FROM stdin;
f11aa87a-32ef-4e85-915d-6f7ef322b8bd	1983c68e-359c-4dbd-9c6e-3a726bb80ab6	346c4aeb-ab0a-4896-8316-fa297bd9c5e5	right	2025-03-07 23:30:45.961167+00	2025-03-07 23:30:45.961167+00
86363ac8-8ba8-479a-b64c-a1446a5a2eb7	45f75109-3fff-4803-88b6-2af6a38fae61	45759d0d-b3bc-40b4-8ff7-422e5146be38	left	2025-03-08 06:28:52.831396+00	2025-03-08 06:28:52.831396+00
a0cbecda-ecde-493d-ba59-d856e4bf1b5e	45f75109-3fff-4803-88b6-2af6a38fae61	9f40bbbc-2d0d-4f0b-915e-3ab2b319464e	right	2025-03-08 07:03:36.04335+00	2025-03-08 07:03:36.04335+00
ddd926e0-2d2b-4b45-b739-776cf2c854bb	0de17386-8f4f-4cd3-a148-05f1519ccbca	82ecf0f5-8920-4291-a020-4a0b2d7f39e1	right	2025-03-08 08:19:05.682521+00	2025-03-08 08:19:05.682521+00
4a80e078-487f-490f-9327-6c7fd6dd44b1	0de17386-8f4f-4cd3-a148-05f1519ccbca	a7ced472-3a4a-43db-ba04-0a8c1cd2a7bb	right	2025-03-08 08:19:06.851351+00	2025-03-08 08:19:06.851351+00
d5d5a1e8-56ea-41b1-a94f-737af041f53d	b1db38c6-55e6-4496-b7ef-52af8bae34c9	82ecf0f5-8920-4291-a020-4a0b2d7f39e1	right	2025-03-08 08:24:30.271186+00	2025-03-08 08:24:30.271186+00
d0f35e6d-6322-48e5-bd65-d52f678e12b8	00231b9f-ae0a-4706-80cb-cf0ba3381122	82ecf0f5-8920-4291-a020-4a0b2d7f39e1	right	2025-03-08 10:17:47.481802+00	2025-03-08 10:17:47.481802+00
61de323e-14ae-4722-9b51-dc4203cb5df2	00231b9f-ae0a-4706-80cb-cf0ba3381122	583496cb-7f1f-42b7-8c60-8a65e3350416	left	2025-03-08 11:24:34.243477+00	2025-03-08 11:24:34.243477+00
6d7cb8b4-7bc9-4bcb-85fc-51e011dec491	00231b9f-ae0a-4706-80cb-cf0ba3381122	e3d0615c-ac7f-4ad7-b870-2cea6eb731df	right	2025-03-08 11:24:35.825699+00	2025-03-08 11:24:35.825699+00
0054b63d-1cca-4e22-b796-0c5d9a6cac9c	00231b9f-ae0a-4706-80cb-cf0ba3381122	7d1cf336-6c1b-495c-87ed-a8504a1ffda4	right	2025-03-08 11:35:08.365977+00	2025-03-08 11:35:08.365977+00
\.


--
-- Data for Name: tag_subcategories; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.tag_subcategories (tag_id, subcategory_id, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: tags; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.tags (id, name, possible_values, is_active, created_at, updated_at, subcategories) FROM stdin;
f23b5a14-bda5-4f74-954f-9a8a2eeb471a	Любимые жанры кино	{драма,комедия,анимация,боевик,фэнтези,приключения,триллер,мелодрама,хоррор,"исторический фильм"}	t	2025-03-08 05:04:05.313163+00	2025-03-08 05:04:05.313163+00	{}
6ce45e4c-8784-461e-be94-f6d15e912cd0	Любимые футбольные команды	{Краснодар,Зенит,Динамо,Локомотив,Спартак,ЦСКА,Ростов,Рубин,"Крылья Советов"}	t	2025-03-08 05:24:06.601317+00	2025-03-08 05:24:13.107645+00	{}
418234af-1612-475b-a1dd-f24b3ae05d3a	Любимые хоккейные команды	{ЦСКА,Металлург,Локомотив,СКА,"Ак Барс",Трактор,Динамо,Спартак,Авангард,"Салават Юлаев"}	t	2025-03-08 05:22:04.171193+00	2025-03-08 05:24:20.639841+00	{}
3c279c2a-e3a6-43c8-90f6-fcf8582a3108	Любимые жанры концертов	{поп,рок,рэп/хип-хоп,"электронная музыка","джаз и блюз","классическая музыка","фолк и этническая музыка","авторская песня (бардовская музыка)"}	t	2025-03-08 05:25:50.496675+00	2025-03-08 05:25:50.496675+00	{}
c2506a4a-90f5-402d-af6b-19cf8cc67e23	Любимые жанры боёв	{MMA,бокс,кикбоксинг,карате,дзюдо,самбо,"тайский бокс","кулачные бои"}	t	2025-03-08 05:42:55.928685+00	2025-03-08 05:42:55.928685+00	{}
9f69a62d-474e-4c60-a763-a0dcff675524	Любимые театральные жанры	{драма,комедия,мюзикл,опера,балет,"иммерсивный театр","экспериментальный театр","кукольный театр",моноспектакль,"фольклорный театр"}	t	2025-03-08 05:20:53.141787+00	2025-03-08 07:12:57.13119+00	{}
\.


--
-- Data for Name: tags_categories; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.tags_categories (tag_id, category_id, created_at, updated_at) FROM stdin;
f23b5a14-bda5-4f74-954f-9a8a2eeb471a	223639e5-fa9b-40b2-9eb1-19c6311a6526	2025-03-08 05:04:05.313163+00	2025-03-08 05:04:05.313163+00
6ce45e4c-8784-461e-be94-f6d15e912cd0	65de3567-219b-490b-93d8-2b78c9c282c3	2025-03-08 05:24:13.107645+00	2025-03-08 05:24:13.107645+00
418234af-1612-475b-a1dd-f24b3ae05d3a	1e17985c-079f-4ed1-adfa-1f8f323265c3	2025-03-08 05:24:20.639841+00	2025-03-08 05:24:20.639841+00
3c279c2a-e3a6-43c8-90f6-fcf8582a3108	a1f78ab2-3583-470e-87b3-62c167b9650b	2025-03-08 05:25:50.496675+00	2025-03-08 05:25:50.496675+00
c2506a4a-90f5-402d-af6b-19cf8cc67e23	c13a5b81-1e73-4152-bde9-0da918f0639b	2025-03-08 05:42:55.928685+00	2025-03-08 05:42:55.928685+00
9f69a62d-474e-4c60-a763-a0dcff675524	04872cbe-1f38-401b-adfd-b2fca1826b63	2025-03-08 07:12:57.13119+00	2025-03-08 07:12:57.13119+00
\.


--
-- Data for Name: user_category_preferences; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.user_category_preferences (id, user_id, subcategory_id, level, created_at, updated_at) FROM stdin;
2	87f27015-1c2b-4f04-9f81-7cb8dd0657e9	04872cbe-1f38-401b-adfd-b2fca1826b63	1	2025-03-07 23:06:38.572616+00	2025-03-07 23:06:38.572616+00
3	87f27015-1c2b-4f04-9f81-7cb8dd0657e9	223639e5-fa9b-40b2-9eb1-19c6311a6526	1	2025-03-07 23:06:38.572616+00	2025-03-07 23:06:38.572616+00
4	3fe65243-bab9-4eae-895a-9ee5d6ab5fdb	04872cbe-1f38-401b-adfd-b2fca1826b63	1	2025-03-07 23:10:55.770638+00	2025-03-07 23:10:55.770638+00
5	3fe65243-bab9-4eae-895a-9ee5d6ab5fdb	223639e5-fa9b-40b2-9eb1-19c6311a6526	1	2025-03-07 23:10:55.770638+00	2025-03-07 23:10:55.770638+00
8	d3bdf899-a34b-4928-b2e9-dfcc6532aea9	a1f78ab2-3583-470e-87b3-62c167b9650b	1	2025-03-07 23:15:52.027992+00	2025-03-07 23:15:52.027992+00
9	d3bdf899-a34b-4928-b2e9-dfcc6532aea9	04872cbe-1f38-401b-adfd-b2fca1826b63	1	2025-03-07 23:15:52.027992+00	2025-03-07 23:15:52.027992+00
12	e2a15c99-1d63-4bb1-a365-dc678222de19	223639e5-fa9b-40b2-9eb1-19c6311a6526	1	2025-03-07 23:23:30.466161+00	2025-03-07 23:23:30.466161+00
13	e2a15c99-1d63-4bb1-a365-dc678222de19	04872cbe-1f38-401b-adfd-b2fca1826b63	1	2025-03-07 23:23:30.466161+00	2025-03-07 23:23:30.466161+00
14	a750ee1c-e3d7-4eb1-aaf8-afc4ef0c504d	223639e5-fa9b-40b2-9eb1-19c6311a6526	1	2025-03-07 23:25:57.152073+00	2025-03-07 23:25:57.152073+00
15	a750ee1c-e3d7-4eb1-aaf8-afc4ef0c504d	04872cbe-1f38-401b-adfd-b2fca1826b63	1	2025-03-07 23:25:57.152073+00	2025-03-07 23:25:57.152073+00
16	1983c68e-359c-4dbd-9c6e-3a726bb80ab6	04872cbe-1f38-401b-adfd-b2fca1826b63	1	2025-03-07 23:29:09.11052+00	2025-03-07 23:29:09.11052+00
17	1983c68e-359c-4dbd-9c6e-3a726bb80ab6	223639e5-fa9b-40b2-9eb1-19c6311a6526	1	2025-03-07 23:29:09.11052+00	2025-03-07 23:29:09.11052+00
18	9161e08f-2c9c-4053-af77-ee91ead17839	223639e5-fa9b-40b2-9eb1-19c6311a6526	1	2025-03-07 23:33:01.718049+00	2025-03-07 23:33:01.718049+00
19	9161e08f-2c9c-4053-af77-ee91ead17839	04872cbe-1f38-401b-adfd-b2fca1826b63	1	2025-03-07 23:33:01.718049+00	2025-03-07 23:33:01.718049+00
22	0736631c-22e1-4cf3-b097-8d3941ad1cda	a1f78ab2-3583-470e-87b3-62c167b9650b	1	2025-03-08 00:15:20.224335+00	2025-03-08 00:15:20.224335+00
23	0736631c-22e1-4cf3-b097-8d3941ad1cda	223639e5-fa9b-40b2-9eb1-19c6311a6526	1	2025-03-08 00:15:20.224335+00	2025-03-08 00:15:20.224335+00
24	0736631c-22e1-4cf3-b097-8d3941ad1cda	b5a85484-ac8a-4585-81e4-a40b17b7009f	1	2025-03-08 00:15:20.224335+00	2025-03-08 00:15:20.224335+00
25	0736631c-22e1-4cf3-b097-8d3941ad1cda	04872cbe-1f38-401b-adfd-b2fca1826b63	1	2025-03-08 00:15:20.224335+00	2025-03-08 00:15:20.224335+00
26	0736631c-22e1-4cf3-b097-8d3941ad1cda	1e17985c-079f-4ed1-adfa-1f8f323265c3	1	2025-03-08 00:15:20.224335+00	2025-03-08 00:15:20.224335+00
27	e6b30f8c-4787-4c2d-a5fa-9b113cd0ebab	04872cbe-1f38-401b-adfd-b2fca1826b63	1	2025-03-08 01:20:36.834233+00	2025-03-08 01:20:36.834233+00
28	e6b30f8c-4787-4c2d-a5fa-9b113cd0ebab	223639e5-fa9b-40b2-9eb1-19c6311a6526	1	2025-03-08 01:20:36.834233+00	2025-03-08 01:20:36.834233+00
29	c24d3fef-228e-4fc6-b828-6fe34725743d	223639e5-fa9b-40b2-9eb1-19c6311a6526	1	2025-03-08 04:39:20.811341+00	2025-03-08 04:39:20.811341+00
30	c24d3fef-228e-4fc6-b828-6fe34725743d	04872cbe-1f38-401b-adfd-b2fca1826b63	1	2025-03-08 04:39:20.811341+00	2025-03-08 04:39:20.811341+00
31	12af004f-56a4-4afe-88e8-a22193defcda	04872cbe-1f38-401b-adfd-b2fca1826b63	1	2025-03-08 04:42:54.012961+00	2025-03-08 04:42:54.012961+00
32	12af004f-56a4-4afe-88e8-a22193defcda	223639e5-fa9b-40b2-9eb1-19c6311a6526	1	2025-03-08 04:42:54.012961+00	2025-03-08 04:42:54.012961+00
33	a4a36803-f798-464d-9825-2e8944eb9ebd	04872cbe-1f38-401b-adfd-b2fca1826b63	1	2025-03-08 04:46:27.430302+00	2025-03-08 04:46:27.430302+00
34	a4a36803-f798-464d-9825-2e8944eb9ebd	223639e5-fa9b-40b2-9eb1-19c6311a6526	1	2025-03-08 04:46:27.430302+00	2025-03-08 04:46:27.430302+00
35	e090f088-97c0-4475-92b5-199e34f38606	223639e5-fa9b-40b2-9eb1-19c6311a6526	1	2025-03-08 04:51:27.127301+00	2025-03-08 04:51:27.127301+00
36	e090f088-97c0-4475-92b5-199e34f38606	71c42e85-0c70-45e7-a589-763764e3dfdc	1	2025-03-08 04:51:27.127301+00	2025-03-08 04:51:27.127301+00
37	e090f088-97c0-4475-92b5-199e34f38606	a1f78ab2-3583-470e-87b3-62c167b9650b	1	2025-03-08 04:51:27.127301+00	2025-03-08 04:51:27.127301+00
38	e090f088-97c0-4475-92b5-199e34f38606	04872cbe-1f38-401b-adfd-b2fca1826b63	1	2025-03-08 04:51:27.127301+00	2025-03-08 04:51:27.127301+00
39	bcdff97c-b3a0-4a25-8661-c994cb124f70	04872cbe-1f38-401b-adfd-b2fca1826b63	1	2025-03-08 04:56:33.952353+00	2025-03-08 04:56:33.952353+00
40	bcdff97c-b3a0-4a25-8661-c994cb124f70	223639e5-fa9b-40b2-9eb1-19c6311a6526	1	2025-03-08 04:56:33.952353+00	2025-03-08 04:56:33.952353+00
41	e2b3a0b0-469a-4b11-870b-9f0f727a22f5	223639e5-fa9b-40b2-9eb1-19c6311a6526	1	2025-03-08 04:58:04.480037+00	2025-03-08 04:58:04.480037+00
42	e2b3a0b0-469a-4b11-870b-9f0f727a22f5	04872cbe-1f38-401b-adfd-b2fca1826b63	1	2025-03-08 04:58:04.480037+00	2025-03-08 04:58:04.480037+00
43	6747dc2c-2de4-474f-960b-5f9409575f4c	e9b9553e-61f2-490d-a74b-a7418ea67477	1	2025-03-08 04:58:54.318069+00	2025-03-08 04:58:54.318069+00
44	6747dc2c-2de4-474f-960b-5f9409575f4c	223639e5-fa9b-40b2-9eb1-19c6311a6526	1	2025-03-08 04:58:54.318069+00	2025-03-08 04:58:54.318069+00
45	45f75109-3fff-4803-88b6-2af6a38fae61	223639e5-fa9b-40b2-9eb1-19c6311a6526	2	2025-03-08 05:01:13.682526+00	2025-03-08 05:01:13.682526+00
46	45f75109-3fff-4803-88b6-2af6a38fae61	04872cbe-1f38-401b-adfd-b2fca1826b63	1	2025-03-08 05:01:13.682526+00	2025-03-08 05:01:13.682526+00
47	75cad536-8fee-472c-ab26-915615f1d352	04872cbe-1f38-401b-adfd-b2fca1826b63	1	2025-03-08 07:11:04.800479+00	2025-03-08 07:11:04.800479+00
48	75cad536-8fee-472c-ab26-915615f1d352	223639e5-fa9b-40b2-9eb1-19c6311a6526	1	2025-03-08 07:11:04.800479+00	2025-03-08 07:11:04.800479+00
49	93192fbc-61a6-4363-8aba-552a9b4cf35d	223639e5-fa9b-40b2-9eb1-19c6311a6526	1	2025-03-08 07:55:35.438928+00	2025-03-08 07:55:35.438928+00
50	93192fbc-61a6-4363-8aba-552a9b4cf35d	04872cbe-1f38-401b-adfd-b2fca1826b63	2	2025-03-08 07:55:35.438928+00	2025-03-08 07:55:35.438928+00
51	93192fbc-61a6-4363-8aba-552a9b4cf35d	e9b9553e-61f2-490d-a74b-a7418ea67477	1	2025-03-08 07:55:35.438928+00	2025-03-08 07:55:35.438928+00
52	c951735b-3547-48e1-aef8-d2555c26ffc3	04872cbe-1f38-401b-adfd-b2fca1826b63	1	2025-03-08 08:11:01.03926+00	2025-03-08 08:11:01.03926+00
53	c951735b-3547-48e1-aef8-d2555c26ffc3	223639e5-fa9b-40b2-9eb1-19c6311a6526	1	2025-03-08 08:11:01.03926+00	2025-03-08 08:11:01.03926+00
54	0de17386-8f4f-4cd3-a148-05f1519ccbca	a1f78ab2-3583-470e-87b3-62c167b9650b	1	2025-03-08 08:18:53.984197+00	2025-03-08 08:18:53.984197+00
55	0de17386-8f4f-4cd3-a148-05f1519ccbca	04872cbe-1f38-401b-adfd-b2fca1826b63	1	2025-03-08 08:18:53.984197+00	2025-03-08 08:18:53.984197+00
56	0de17386-8f4f-4cd3-a148-05f1519ccbca	223639e5-fa9b-40b2-9eb1-19c6311a6526	1	2025-03-08 08:18:53.984197+00	2025-03-08 08:18:53.984197+00
57	b1db38c6-55e6-4496-b7ef-52af8bae34c9	223639e5-fa9b-40b2-9eb1-19c6311a6526	1	2025-03-08 08:23:50.29851+00	2025-03-08 08:23:50.29851+00
58	b1db38c6-55e6-4496-b7ef-52af8bae34c9	04872cbe-1f38-401b-adfd-b2fca1826b63	1	2025-03-08 08:23:50.29851+00	2025-03-08 08:23:50.29851+00
59	00231b9f-ae0a-4706-80cb-cf0ba3381122	223639e5-fa9b-40b2-9eb1-19c6311a6526	1	2025-03-08 10:17:35.39969+00	2025-03-08 10:17:35.39969+00
60	00231b9f-ae0a-4706-80cb-cf0ba3381122	71c42e85-0c70-45e7-a589-763764e3dfdc	1	2025-03-08 10:17:35.39969+00	2025-03-08 10:17:35.39969+00
61	00231b9f-ae0a-4706-80cb-cf0ba3381122	04872cbe-1f38-401b-adfd-b2fca1826b63	1	2025-03-08 10:17:35.39969+00	2025-03-08 10:17:35.39969+00
62	00231b9f-ae0a-4706-80cb-cf0ba3381122	a1f78ab2-3583-470e-87b3-62c167b9650b	1	2025-03-08 10:17:35.39969+00	2025-03-08 10:17:35.39969+00
\.


--
-- Data for Name: user_tag_preferences; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.user_tag_preferences (id, user_id, tag_id, selected_values, created_at, updated_at) FROM stdin;
13	75cad536-8fee-472c-ab26-915615f1d352	9f69a62d-474e-4c60-a763-a0dcff675524	{драма,комедия}	2025-03-08 07:18:20.750168+00	2025-03-08 07:18:20.750168+00
14	93192fbc-61a6-4363-8aba-552a9b4cf35d	9f69a62d-474e-4c60-a763-a0dcff675524	{драма}	2025-03-08 07:55:39.587794+00	2025-03-08 07:55:39.587794+00
15	c951735b-3547-48e1-aef8-d2555c26ffc3	9f69a62d-474e-4c60-a763-a0dcff675524	{драма,комедия}	2025-03-08 08:11:06.256444+00	2025-03-08 08:11:06.256444+00
16	0de17386-8f4f-4cd3-a148-05f1519ccbca	3c279c2a-e3a6-43c8-90f6-fcf8582a3108	{"электронная музыка"}	2025-03-08 08:18:56.204739+00	2025-03-08 08:18:56.204739+00
17	b1db38c6-55e6-4496-b7ef-52af8bae34c9	f23b5a14-bda5-4f74-954f-9a8a2eeb471a	{драма}	2025-03-08 08:23:54.235419+00	2025-03-08 08:23:54.235419+00
18	b1db38c6-55e6-4496-b7ef-52af8bae34c9	9f69a62d-474e-4c60-a763-a0dcff675524	{комедия}	2025-03-08 08:23:54.235419+00	2025-03-08 08:23:54.235419+00
19	00231b9f-ae0a-4706-80cb-cf0ba3381122	f23b5a14-bda5-4f74-954f-9a8a2eeb471a	{"исторический фильм"}	2025-03-08 10:17:37.575114+00	2025-03-08 10:17:37.575114+00
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (id, telegram_id, created_at, updated_at, temp_id, last_active_at) FROM stdin;
35d99d4b-0a30-4470-bccb-e06a0155c319	23456787654	2025-03-07 22:53:56.259542+00	2025-03-07 22:53:56.259542+00	60d6db00-ccfc-4330-a20a-4596bed10980	2025-03-07 22:53:56.259542+00
180b776d-0064-4ce3-b64e-d6a40424a902	23456789098765	2025-03-07 22:56:10.470518+00	2025-03-07 22:56:10.470518+00	b9f277d0-41db-4af4-8d10-e36cbc5f602c	2025-03-07 22:56:10.470518+00
bcdff97c-b3a0-4a25-8661-c994cb124f70	456787654	2025-03-07 22:57:19.252573+00	2025-03-07 22:57:19.252573+00	39e27df7-7306-42ec-b8e9-2b80aa3f3c17	2025-03-07 22:57:19.252573+00
9d45b390-e91b-46ba-a5ff-9726da77c9f6	345678987654	2025-03-07 22:57:28.286701+00	2025-03-07 22:57:28.286701+00	f134f87b-521b-45e9-a1be-c3ebc4f69ffb	2025-03-07 22:57:28.286701+00
34840d1c-c2b9-4378-8915-0adc366898c0	4567890	2025-03-07 23:00:06.556842+00	2025-03-07 23:00:06.556842+00	0c96ecaa-f7c6-4caf-9909-b7d9f942a196	2025-03-07 23:00:06.556842+00
87f27015-1c2b-4f04-9f81-7cb8dd0657e9	3456789	2025-03-07 23:06:35.748427+00	2025-03-07 23:06:35.748427+00	117d06c0-32c2-42fe-b6d4-00b78e6c2a09	2025-03-07 23:06:35.748427+00
6fd78383-8de5-455e-8afd-7a9dffc8854d	45678765456	2025-03-07 23:07:05.544489+00	2025-03-07 23:07:05.544489+00	238d6afb-d76a-4495-9433-1f8cf4dab76e	2025-03-07 23:07:05.544489+00
e2a15c99-1d63-4bb1-a365-dc678222de19	5678765678	2025-03-07 23:07:11.486575+00	2025-03-07 23:07:11.486575+00	1a466cdf-4c80-40ef-8212-b4ed43ff8273	2025-03-07 23:07:11.486575+00
5b7386dd-2cd2-4c75-9fed-4a875dd10c57	567876546789	2025-03-07 23:07:22.121251+00	2025-03-07 23:07:22.121251+00	becbd545-f6e7-4b26-9e55-04b945d2c58e	2025-03-07 23:07:22.121251+00
3fe65243-bab9-4eae-895a-9ee5d6ab5fdb	456787654567	2025-03-07 23:10:52.292811+00	2025-03-07 23:10:52.292811+00	047f9a13-420b-45a1-9fc1-0bfd26dbda7d	2025-03-07 23:10:52.292811+00
d3bdf899-a34b-4928-b2e9-dfcc6532aea9	45678909876	2025-03-07 23:15:49.602274+00	2025-03-07 23:15:49.602274+00	e71bc910-8fe2-49d7-b392-462ce511a5af	2025-03-07 23:15:49.602274+00
87ae9394-8998-4cf9-8f8e-98549a330db1	5678765	2025-03-07 23:20:29.276449+00	2025-03-07 23:20:29.276449+00	9b1ae714-bc2f-475a-aa2e-4e1847d36f1d	2025-03-07 23:20:29.276449+00
8352f818-449d-476c-a101-a9a621193f77	567876567	2025-03-07 23:23:23.057736+00	2025-03-07 23:23:23.057736+00	e78d32a5-cfdd-4a9b-b53e-ff4a5212cfb0	2025-03-07 23:23:23.057736+00
a750ee1c-e3d7-4eb1-aaf8-afc4ef0c504d	5678976567	2025-03-07 23:25:54.226627+00	2025-03-07 23:25:54.226627+00	599fc967-1af9-46c8-8a38-921d514681f9	2025-03-07 23:25:54.226627+00
1983c68e-359c-4dbd-9c6e-3a726bb80ab6	56785678	2025-03-07 23:29:05.887519+00	2025-03-07 23:29:05.887519+00	290f84ff-0db3-49d6-936c-f024a4ccae4f	2025-03-07 23:29:05.887519+00
e6b30f8c-4787-4c2d-a5fa-9b113cd0ebab	45678987654	2025-03-07 23:31:34.170696+00	2025-03-07 23:31:34.170696+00	dc211486-c401-493a-a5ff-af75eaa8fab4	2025-03-07 23:31:34.170696+00
9a001e8c-8e35-4ca7-9823-4c22caa41fa2	654321	2025-03-07 23:32:28.882625+00	2025-03-07 23:32:28.882625+00	21174ec1-1402-4345-8ae9-83b582d77c8e	2025-03-07 23:32:28.882625+00
9161e08f-2c9c-4053-af77-ee91ead17839	567895456789	2025-03-07 23:32:58.787054+00	2025-03-07 23:32:58.787054+00	5bd83446-ed27-4c0c-bdb2-e2fd6d51db1e	2025-03-07 23:32:58.787054+00
0736631c-22e1-4cf3-b097-8d3941ad1cda	4567876545678	2025-03-07 23:34:57.451559+00	2025-03-07 23:34:57.451559+00	9b362a81-d8e9-4565-a746-7f69ab1f89cd	2025-03-07 23:34:57.451559+00
c24d3fef-228e-4fc6-b828-6fe34725743d	4567898	2025-03-08 04:39:18.139296+00	2025-03-08 04:39:18.139296+00	8c57474d-bf59-4e55-ad99-5b805c082fea	2025-03-08 04:39:18.139296+00
12af004f-56a4-4afe-88e8-a22193defcda	56473654	2025-03-08 04:42:48.245482+00	2025-03-08 04:42:48.245482+00	aa5c4d6f-ad15-4a1a-bcd3-537f9400cbca	2025-03-08 04:42:48.245482+00
a4a36803-f798-464d-9825-2e8944eb9ebd	536784573	2025-03-08 04:46:25.027777+00	2025-03-08 04:46:25.027777+00	838908f4-831b-44d5-95a5-a5e9ee2a31e6	2025-03-08 04:46:25.027777+00
9ad40473-aef8-450f-b59a-d61fdedd85db	876567875	2025-03-08 04:51:15.687609+00	2025-03-08 04:51:15.687609+00	9344b7e9-dcfb-4cce-be8b-1ebc45c56a4c	2025-03-08 04:51:15.687609+00
e090f088-97c0-4475-92b5-199e34f38606	7366387847878	2025-03-08 04:51:22.408478+00	2025-03-08 04:51:22.408478+00	3f5ed94c-80a6-41cf-abb1-57cee0c4d26d	2025-03-08 04:51:22.408478+00
e2b3a0b0-469a-4b11-870b-9f0f727a22f5	987654345678	2025-03-08 04:58:01.921233+00	2025-03-08 04:58:01.921233+00	f2352d87-e7ed-414e-852f-431cb77bab11	2025-03-08 04:58:01.921233+00
6747dc2c-2de4-474f-960b-5f9409575f4c	5748398746	2025-03-08 04:58:50.178531+00	2025-03-08 04:58:50.178531+00	55ed4659-6ce7-4b53-9a04-fa30a54e338e	2025-03-08 04:58:50.178531+00
73578882-b1f2-4cb8-921c-a4490e290c08	87654567890	2025-03-08 05:01:04.092848+00	2025-03-08 05:01:04.092848+00	00bf88c3-b943-499a-917d-95150a788da9	2025-03-08 05:01:04.092848+00
45f75109-3fff-4803-88b6-2af6a38fae61	87656789876	2025-03-08 05:01:09.332813+00	2025-03-08 05:01:09.332813+00	aa819444-e812-4a72-8ac7-a6cb4cd1a7c4	2025-03-08 05:01:09.332813+00
75cad536-8fee-472c-ab26-915615f1d352	65748392837	2025-03-08 07:10:41.027538+00	2025-03-08 07:10:41.027538+00	2e1b6bcb-09b7-4944-8b11-796dc59d9089	2025-03-08 07:10:41.027538+00
93192fbc-61a6-4363-8aba-552a9b4cf35d	4637823647	2025-03-08 07:55:30.636996+00	2025-03-08 07:55:30.636996+00	d3c90a7b-1151-4e83-823e-5466da268181	2025-03-08 07:55:30.636996+00
c951735b-3547-48e1-aef8-d2555c26ffc3	45678654	2025-03-08 08:10:51.665129+00	2025-03-08 08:10:51.665129+00	6e9c5ddf-f4d3-4832-850b-cca72f991101	2025-03-08 08:10:51.665129+00
0de17386-8f4f-4cd3-a148-05f1519ccbca	654324	2025-03-08 08:18:50.778341+00	2025-03-08 08:18:50.778341+00	feff1f4d-9e52-4a58-91bb-6f0179c46d33	2025-03-08 08:18:50.778341+00
b1db38c6-55e6-4496-b7ef-52af8bae34c9	456789	2025-03-08 08:23:46.538559+00	2025-03-08 08:23:46.538559+00	5000da15-2282-4821-bc94-07fbfd113cdc	2025-03-08 08:23:46.538559+00
00231b9f-ae0a-4706-80cb-cf0ba3381122	657849328475	2025-03-08 10:17:31.640424+00	2025-03-08 10:17:31.640424+00	7904e1a0-8632-4d81-8b51-dbdcee820c03	2025-03-08 10:17:31.640424+00
\.


--
-- Name: migrations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.migrations_id_seq', 57, true);


--
-- Name: user_category_preferences_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.user_category_preferences_id_seq', 62, true);


--
-- Name: user_tag_preferences_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.user_tag_preferences_id_seq', 19, true);


--
-- Name: admins admins_login_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.admins
    ADD CONSTRAINT admins_login_key UNIQUE (login);


--
-- Name: admins admins_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.admins
    ADD CONSTRAINT admins_pkey PRIMARY KEY (id);


--
-- Name: categories categories_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_pkey PRIMARY KEY (id);


--
-- Name: event_tags event_tags_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.event_tags
    ADD CONSTRAINT event_tags_pkey PRIMARY KEY (event_id, tag_id);


--
-- Name: events events_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.events
    ADD CONSTRAINT events_pkey PRIMARY KEY (id);


--
-- Name: migrations migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.migrations
    ADD CONSTRAINT migrations_pkey PRIMARY KEY (id);


--
-- Name: sessions sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_pkey PRIMARY KEY (id);


--
-- Name: subcategories subcategories_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.subcategories
    ADD CONSTRAINT subcategories_pkey PRIMARY KEY (id);


--
-- Name: swipes swipes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.swipes
    ADD CONSTRAINT swipes_pkey PRIMARY KEY (id);


--
-- Name: tag_subcategories tag_subcategories_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tag_subcategories
    ADD CONSTRAINT tag_subcategories_pkey PRIMARY KEY (tag_id, subcategory_id);


--
-- Name: tags_categories tags_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tags_categories
    ADD CONSTRAINT tags_categories_pkey PRIMARY KEY (tag_id, category_id);


--
-- Name: tags tags_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tags
    ADD CONSTRAINT tags_pkey PRIMARY KEY (id);


--
-- Name: user_category_preferences user_category_preferences_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_category_preferences
    ADD CONSTRAINT user_category_preferences_pkey PRIMARY KEY (id);


--
-- Name: user_category_preferences user_category_preferences_user_id_subcategory_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_category_preferences
    ADD CONSTRAINT user_category_preferences_user_id_subcategory_id_key UNIQUE (user_id, subcategory_id);


--
-- Name: user_tag_preferences user_tag_preferences_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_tag_preferences
    ADD CONSTRAINT user_tag_preferences_pkey PRIMARY KEY (id);


--
-- Name: user_tag_preferences user_tag_preferences_user_id_tag_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_tag_preferences
    ADD CONSTRAINT user_tag_preferences_user_id_tag_id_key UNIQUE (user_id, tag_id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: users users_telegram_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_telegram_id_key UNIQUE (telegram_id);


--
-- Name: users users_temp_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_temp_id_key UNIQUE (temp_id);


--
-- Name: idx_categories_parent_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_categories_parent_id ON public.categories USING btree (parent_id);


--
-- Name: idx_event_tags_values; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_event_tags_values ON public.event_tags USING gin (selected_values);


--
-- Name: idx_events_subcategories; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_events_subcategories ON public.events USING gin (subcategories);


--
-- Name: idx_sessions_expires_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sessions_expires_at ON public.sessions USING btree (expires_at);


--
-- Name: idx_subcategories_category_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_subcategories_category_id ON public.subcategories USING btree (category_id);


--
-- Name: idx_swipes_direction; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_swipes_direction ON public.swipes USING btree (direction);


--
-- Name: idx_swipes_event_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_swipes_event_id ON public.swipes USING btree (event_id);


--
-- Name: idx_swipes_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_swipes_user_id ON public.swipes USING btree (user_id);


--
-- Name: idx_tag_subcategories_subcategory_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_tag_subcategories_subcategory_id ON public.tag_subcategories USING btree (subcategory_id);


--
-- Name: idx_tags_categories_category_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_tags_categories_category_id ON public.tags_categories USING btree (category_id);


--
-- Name: idx_tags_categories_tag_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_tags_categories_tag_id ON public.tags_categories USING btree (tag_id);


--
-- Name: idx_tags_is_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_tags_is_active ON public.tags USING btree (is_active);


--
-- Name: idx_tags_possible_values; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_tags_possible_values ON public.tags USING gin (possible_values);


--
-- Name: idx_tags_subcategories; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_tags_subcategories ON public.tags USING gin (subcategories);


--
-- Name: idx_user_tag_preferences_tag_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_tag_preferences_tag_id ON public.user_tag_preferences USING btree (tag_id);


--
-- Name: idx_user_tag_preferences_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_tag_preferences_user_id ON public.user_tag_preferences USING btree (user_id);


--
-- Name: idx_users_telegram_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_telegram_id ON public.users USING btree (telegram_id);


--
-- Name: sessions cleanup_expired_sessions_trigger; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER cleanup_expired_sessions_trigger AFTER INSERT OR UPDATE ON public.sessions FOR EACH ROW EXECUTE FUNCTION public.cleanup_expired_sessions();


--
-- Name: user_category_preferences ensure_subcategory_reference; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER ensure_subcategory_reference BEFORE INSERT OR UPDATE ON public.user_category_preferences FOR EACH ROW EXECUTE FUNCTION public.validate_subcategory_reference();


--
-- Name: admins update_admins_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_admins_updated_at BEFORE UPDATE ON public.admins FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: categories update_categories_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON public.categories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: event_tags update_event_tags_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_event_tags_updated_at BEFORE UPDATE ON public.event_tags FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: events update_events_updated_at_trigger; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_events_updated_at_trigger BEFORE UPDATE ON public.events FOR EACH ROW EXECUTE FUNCTION public.update_events_updated_at();


--
-- Name: subcategories update_subcategories_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_subcategories_updated_at BEFORE UPDATE ON public.subcategories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: swipes update_swipes_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_swipes_updated_at BEFORE UPDATE ON public.swipes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: tag_subcategories update_tag_subcategories_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_tag_subcategories_updated_at BEFORE UPDATE ON public.tag_subcategories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: tags_categories update_tags_categories_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_tags_categories_updated_at BEFORE UPDATE ON public.tags_categories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: tags update_tags_timestamp; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_tags_timestamp BEFORE UPDATE ON public.tags FOR EACH ROW EXECUTE FUNCTION public.update_timestamp();


--
-- Name: tags update_tags_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_tags_updated_at BEFORE UPDATE ON public.tags FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: user_category_preferences update_user_category_preferences_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_user_category_preferences_updated_at BEFORE UPDATE ON public.user_category_preferences FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: user_tag_preferences update_user_tag_preferences_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_user_tag_preferences_updated_at BEFORE UPDATE ON public.user_tag_preferences FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: users update_users_last_active; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_users_last_active BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.update_last_active_at();


--
-- Name: users update_users_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: events validate_event_subcategories_trigger; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER validate_event_subcategories_trigger BEFORE INSERT OR UPDATE ON public.events FOR EACH ROW EXECUTE FUNCTION public.validate_event_subcategories();


--
-- Name: event_tags validate_event_tag_values; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER validate_event_tag_values BEFORE INSERT OR UPDATE ON public.event_tags FOR EACH ROW EXECUTE FUNCTION public.validate_event_tag_values();


--
-- Name: categories categories_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.categories(id);


--
-- Name: event_tags event_tags_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.event_tags
    ADD CONSTRAINT event_tags_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE;


--
-- Name: event_tags event_tags_tag_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.event_tags
    ADD CONSTRAINT event_tags_tag_id_fkey FOREIGN KEY (tag_id) REFERENCES public.tags(id) ON DELETE CASCADE;


--
-- Name: subcategories subcategories_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.subcategories
    ADD CONSTRAINT subcategories_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE CASCADE;


--
-- Name: swipes swipes_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.swipes
    ADD CONSTRAINT swipes_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: tag_subcategories tag_subcategories_subcategory_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tag_subcategories
    ADD CONSTRAINT tag_subcategories_subcategory_id_fkey FOREIGN KEY (subcategory_id) REFERENCES public.subcategories(id) ON DELETE CASCADE;


--
-- Name: tag_subcategories tag_subcategories_tag_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tag_subcategories
    ADD CONSTRAINT tag_subcategories_tag_id_fkey FOREIGN KEY (tag_id) REFERENCES public.tags(id) ON DELETE CASCADE;


--
-- Name: tags_categories tags_categories_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tags_categories
    ADD CONSTRAINT tags_categories_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE CASCADE;


--
-- Name: tags_categories tags_categories_tag_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tags_categories
    ADD CONSTRAINT tags_categories_tag_id_fkey FOREIGN KEY (tag_id) REFERENCES public.tags(id) ON DELETE CASCADE;


--
-- Name: user_category_preferences user_category_preferences_subcategory_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_category_preferences
    ADD CONSTRAINT user_category_preferences_subcategory_id_fkey FOREIGN KEY (subcategory_id) REFERENCES public.categories(id) ON DELETE CASCADE;


--
-- Name: user_category_preferences user_category_preferences_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_category_preferences
    ADD CONSTRAINT user_category_preferences_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: user_tag_preferences user_tag_preferences_tag_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_tag_preferences
    ADD CONSTRAINT user_tag_preferences_tag_id_fkey FOREIGN KEY (tag_id) REFERENCES public.tags(id) ON DELETE CASCADE;


--
-- Name: user_tag_preferences user_tag_preferences_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_tag_preferences
    ADD CONSTRAINT user_tag_preferences_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

